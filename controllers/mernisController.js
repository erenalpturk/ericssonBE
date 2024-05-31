const { Pool } = require("pg");
const connectionString = process.env.CONNECTION_URL;
const pool = new Pool({ connectionString });


const getMernis = async (req, res) => {
    const type = req.params.type;
    const query = `SELECT tckn, birth_date FROM "public"."mernisTable" WHERE stock = 'available' and type= '${type}' LIMIT 1;`;
    pool.query(
        query, (error, result) => {
            if (error) {
                console.error("Error executing query", error);
                res.status(500).json({ error: "Internal Server Error" });
                return;
            }
            if (result.rows.length === 0) {
                res.json({ message: `${type} kalmamış knk` });
            } else {
                const mernis = result.rows[0];
                res.json(mernis);
                pool.query(
                    `UPDATE "public"."mernisTable" SET stock= 'sold' WHERE tckn = '${mernis.tckn}'`,
                )
            }
        }
    );
};

const getAll = async (req, res) => {
    pool.query(
        `SELECT * FROM "public"."mernisTable"`,
        (error, result) => {
            if (error) {
                console.error("Error executing query", error);
                res.status(500).json({ error: "Internal Server Error" });
                return;
            }
            if (result.rows.length === 0) {
                res.json({message: "Mernis kalmamış knk"});
            } else {
                res.json(result.rows);
            }
        }
    );
};

const deleteSold = async (req, res) => {
    const query = `DELETE FROM "public"."mernisTable" WHERE stock = 'sold'`;
    pool.query(query, (error, result) => {
        if (error) {
            console.error("Error executing query", error);
            res.status(500).json({ error: "Internal Server Error" });
            return;
        }
        res.json({ message: "Kullanılmış mernis'ler silindi" });
    });
};

module.exports = {
    getMernis,
    getAll,
    deleteSold
};
