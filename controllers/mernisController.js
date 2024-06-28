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
                res.json({ message: "Mernis kalmamış knk" });
            } else {
                res.json(result.rows);
            }
        }
    );
};

const getAllSpesific = async (req, res) => {
    const type = req.params.type;
    const stock = req.params.stock;
    pool.query(
      `SELECT * FROM "public"."mernisTable" WHERE type = '${type}' AND stock = '${stock}'`,
      (error, result) => {
        if (error) {
          console.error("Error executing query", error);
          res.status(500).json({ error: "Internal Server Error" });
          return;
        }
  
        if (result.rows.length === 0) {
          res.json({ message: `${type} türünde ${stock} mernis kalmamış knk` });
        } else {
  
          res.json({
            message: `${result.rows.length} adet ${type} türünde ${stock} mernis bulundu`,
            data: result.rows
          });
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

const addMernis = async (req, res) => {
    const mernisData = req.body.mernisData;
    if (!mernisData) {
        res.status(400).json({ error: "Mernis verisi gereklidir" });
        return;
    }

    // Verileri uygun formata dönüştürme
    const values = mernisData.map(data => `('${data.tckn}', '${data.birth_date}', '${data.type}', '${data.stock}')`).join(',');

    const query = `
      INSERT INTO "public"."mernisTable" (tckn, birth_date, type, stock)
      VALUES ${values};
    `;

    pool.query(query, (error, result) => {
        if (error) {
            console.error("Query hatası", error);
            res.status(500).json({ error: "Sunucu Hatası" });
            return;
        }
        res.json({ message: "Mernis verileri başarıyla eklendi" });
    });
};

const parseMernisData = (input, input2) => {
    const records = input.split('------------------------------------')
                        .map(record => record.trim())
                        .filter(record => record.length > 0);

    return records.map(record => {
        const lines = record.split('\n').map(line => line.trim());
        const birthDateLine = lines.find(line => line.startsWith('DOĞUM TARİHİ'));
        const tcknLine = lines.find(line => line.startsWith('TCKN'));

        let birthDate = birthDateLine.split(':')[1].trim().replace(/\//g, '.');

        // Adjusting the birthDate format to remove leading zeros
        birthDate = birthDate.split('.').map(part => part.length === 1 ? `0${part}` : part).join('.');

        const tckn = tcknLine.split(':')[1].trim();

        return {
            tckn: tckn,
            birth_date: birthDate,
            type: input2,
            stock: 'available'
        };
    });
};


const mernisData = async (req, res) => {
    try { console.log(req.params);
        const data = parseMernisData(req.body,req.params.type);

        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const queryText = 'INSERT INTO "public"."mernisTable" (tckn, birth_date, type, stock) VALUES ($1, $2, $3, $4)';
            for (const record of data) {
                await client.query(queryText, [record.tckn, record.birth_date,req.params.type, record.stock]);
            }
            await client.query('COMMIT');
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }

        res.status(201).json({ mernisData: data });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

module.exports = {
    getMernis,
    getAll,
    deleteSold,
    addMernis,
    getAllSpesific,
    mernisData
};
