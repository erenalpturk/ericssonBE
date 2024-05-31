const { Pool } = require("pg");
const connectionString = process.env.CONNECTION_URL;
const pool = new Pool({ connectionString });


const getIccid = async (req, res) => {
  pool.query(
    `SELECT userid ,iccid FROM "public"."users" WHERE stock = 'available' LIMIT 1`,
    (error, result) => {
      if (error) {
        console.error("Error executing query", error);
        res.status(500).json({ error: "Internal Server Error" });
        return;
      }

      if (result.rows.length === 0) {
        res.json({ message: "ICCID kalmamış knk" });
      } else {
        const iccid = result.rows[0].iccid;
        res.json(iccid);
        pool.query(
          `UPDATE "public"."users" SET stock= 'reserved' WHERE iccid = '${iccid}'`,
        )
      }
    }
  );
};

const getAll = async (req, res) => {
  pool.query(
    `SELECT * FROM "public"."users"`,
    (error, result) => {
      if (error) {
        console.error("Error executing query", error);
        res.status(500).json({ error: "Internal Server Error" });
        return;
      }

      if (result.rows.length === 0) {
        res.json({ message: "ICCID kalmamış knk" });
      } else {
        res.json(result.rows);
      }
    }
  );
};

const setSold = async (req, res) => {
  const { iccid } = req.body; 
  if (!iccid) {
    res.status(400).json({ error: "ICCID is required" });
    return;
  }
  const query = `
    UPDATE "public"."users"
    SET stock = 'sold'
    WHERE iccid = $1;
  `;
  pool.query(query, [iccid], (error, result) => {
    if (error) {
      console.error("Error executing query", error);
      res.status(500).json({ error: "Internal Server Error" });
      return;
    }
    
    if (result.rowCount === 0) {
      res.status(404).json({ message: "ICCID not found" });
    } else {
      res.json({ message: `ICCID ${iccid} has been sold` });
    }
  }
  );
};

const setAvailable = async (req, res) => {
  const { iccid } = req.body; // body'de iccid adında bir alan bekliyoruz
  if (!iccid) {
    res.status(400).json({ error: "ICCID is required" });
    return;
  }
  const query = `
    UPDATE "public"."users"
    SET stock = 'available'
    WHERE iccid = $1;
  `;
  pool.query(query, [iccid], (error, result) => {
    if (error) {
      console.error("Error executing query", error);
      res.status(500).json({ error: "Internal Server Error" });
      return;
    }
    
    if (result.rowCount === 0) {
      res.status(404).json({ message: "ICCID not found" });
    } else {
      res.json({ message: `ICCID ${iccid} is now available` });
    }
  }
  );
};

const addIccid = async (req, res) => {
  const iccids = req.body.iccids; 
  const values = iccids.map(iccid => `('${iccid}', 'available')`).join(',');
  const query = `
    INSERT INTO "public"."users" (iccid, stock)
    VALUES ${values};
  `;

  pool.query(query, (error, result) => {
    if (error) {
      console.error("Error executing query", error);
      res.status(500).json({ error: "Internal Server Error" });
      return;
    }
    res.json({ message: "ICCID'ler eklendi" });
  });
};

/*{
  İstekteki body formatı şu şekilde olmalıdır:
  "iccids": ["12345678901", "12345678902", "12345678903", "12345678904", "12345678905", "12345678906", "12345678907"]
}*/


const deleteAll = async (req, res) => {
  const query = `DELETE FROM "public"."users" WHERE stock = 'sold' or stock = 'reserved'`;

  pool.query(query, (error, result) => {
    if (error) {
      console.error("Error executing query", error);
      res.status(500).json({ error: "Internal Server Error" });
      return;
    }
    res.json({ message: "ICCID'ler silindi" });
  });
};


module.exports = {
  getIccid,
  setSold,
  setAvailable,
  addIccid,
  getAll,
  deleteAll
};
