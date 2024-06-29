const { Pool } = require("pg");
const connectionString = process.env.CONNECTION_URL;
const pool = new Pool({ connectionString });


const getIccid = async (req, res) => {
  const type = req.params.type;
  const query = `SELECT iccid FROM "public"."iccidTable" WHERE stock = 'available' and type= '${type}' LIMIT 1;`
    ;
  pool.query(
    query, (error, result) => {
      if (error) {
        console.error("Error executing query", error);
        res.status(500).json({ error: "Internal Server Error" });
        return;
      }
      if (result.rows.length === 0) {
        res.status(404).json({ error: `${type} türünde ICCID kalmamış knk` });
      } else {
        const iccid = result.rows[0].iccid;
        res.json(iccid);
        pool.query(
          `UPDATE "public"."iccidTable" SET stock= 'reserved' WHERE iccid = '${iccid}'`,
        )
      }
    }
  );
};

const getAllSpesific = async (req, res) => {
  const type = req.params.type;
  const stock = req.params.stock;
  pool.query(
    `SELECT * FROM "public"."iccidTable" WHERE type = '${type}' AND stock = '${stock}'`,
    (error, result) => {
      if (error) {
        console.error("Error executing query", error);
        res.status(500).json({ error: "Internal Server Error" });
        return;
      }

      if (result.rows.length === 0) {
        res.json({ message: `${type} türünde ${stock} ICCID kalmamış knk` });
      } else {

        res.json({
          message: `${result.rows.length} adet ${type} türünde ${stock} ICCID bulundu`,
          data: result.rows
        });
      }
    }
  );
};
const getAll = async (req, res) => {
  pool.query(
    `SELECT * FROM "public"."iccidTable"`,
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
    UPDATE "public"."iccidTable"
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
/*
  setSold body formatı şu şekilde olmalıdır:
  {"iccid": "786996789"}
*/

const setAvailable = async (req, res) => {
  const { iccid } = req.body; // body'de iccid adında bir alan bekliyoruz
  if (!iccid) {
    res.status(400).json({ error: "ICCID is required" });
    return;
  }
  const query = `
    UPDATE "public"."iccidTable"
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
/*
  setAvailable body formatı şu şekilde olmalıdır:
  {"iccid": "786996789"}
*/

function formatICCID(input) {
  let cleanedInput = input.replace(/\s+/g, '');
  let iccids = cleanedInput.match(/.{1,20}/g);
  return iccids;
}

const addIccid = async (req, res) => {
  const iccids = formatICCID(req.body);
  const iccidType = req.params.type; 
  if (!iccids || !iccidType) {
    res.status(400).json({ error: "ICCID'ler ve ICCID tipi gereklidir" });
    return;
  }
  const values = iccids.map(iccid => `('${iccid}', 'available', '${iccidType}')`).join(',');
  const query = `
    INSERT INTO "public"."iccidTable" (iccid, stock, type)
    VALUES ${values};
  `;
  pool.query(query, (error, result) => {
    if (error) {
      console.error("Error executing query", error);
      res.status(500).json({ error: "Internal Server Error" });
      return;
    }
    res.json({ message: "ICCID'ler başarıyla eklendi" });
  });

};

/*
  addIccid body formatı şu şekilde olmalıdır:
  {"iccids": ["786996789", "67896789", "678476", "56794", "576985679"],
  "type": "regpre"}
*/


const deleteAll = async (req, res) => {
  const query = `DELETE FROM "public"."iccidTable" WHERE stock = 'sold' or stock = 'reserved'`;

  pool.query(query, (error, result) => {
    if (error) {
      console.error("Error executing query", error);
      res.status(500).json({ error: "Internal Server Error" });
      return;
    }
    res.json({ message: "Reserved ve sold ICCID'ler silindi" });
  });
};
const resetIccid = async (req, res) => {
  const query = `DELETE FROM "public"."iccidTable";`;

  pool.query(query, (error, result) => {
    if (error) {
      console.error("Error executing query", error);
      res.status(500).json({ error: "Internal Server Error" });
      return;
    }
    res.json({ message: "Tüm ICCID'ler silindi" });
  });
};


const addActivation = async (req, res) => {
  const msisdn = req.body.msisdn;
  const tckn = req.body.tckn;
  const birth_date = req.body.birth_date;
  const activationType = req.body.activationtype;
  const user = req.body.user;

  pool.query(
    `SELECT * FROM "public"."activationstable" WHERE msisdn = $1`,
    [msisdn],
    (error, result) => {
      if (error) {
        console.error("Error executing query", error);
        res.status(500).json({ error: "Internal Server Error" });
        return;
      }

      if (result.rows.length > 0) {
        res.status(400).json({ error: "Bu MSISDN zaten kayıtlı" });
        return;
      } else {
        if (!msisdn) {
          res.status(400).json({ error: "msisdn alanı doldurulmadı" });
          return;
        } else if (!tckn) {
          res.status(400).json({ error: "tckn alanı doldurulmadı" });
          return;
        } else if (!birth_date) {
          res.status(400).json({ error: "birth_date alanı doldurulmadı" });
          return;
        } else if (!activationType) {
          res.status(400).json({ error: "activationType alanı doldurulmadı" });
          return;
        }

        const query = `
          INSERT INTO "public"."activationstable" (msisdn, tckn, birth_date, activationType, "user", created_at)
          VALUES ($1, $2, $3, $4, $5, NOW() AT TIME ZONE 'Europe/Istanbul')
        `;

        pool.query(query, [msisdn, tckn, birth_date, activationType, user], (error, result) => {
          if (error) {
            console.error("Error executing query", error);
            res.status(500).json({ error: "Internal Server Error" });
            return;
          }

          res.json({ message: "Data Db'ye başarıyla eklendi" });
        });
      }
    }
  );
};


const getActivations = async (req, res) => {
  const user = req.params.user;
  const query = `SELECT * FROM "public"."activationstable" WHERE "user"='${user} ORDER BY created_at DESC;`
  pool.query(
    query, (error, result) => {
      if (error) {
        console.error("Error executing query", error);
        res.status(500).json({ error: "Internal Server Error" });
        return;
      }
      if (result.rows.length === 0) {
        res.json({ message: `Datan kalmamış knk` });
      } else {
        const data = result.rows;
        res.json(data);
      }
    }
  );
};

const getActivationsPublic = async (req, res) => {
  const query = `SELECT *
FROM public.activationstable
WHERE "user" NOT IN ('alp', 'enes')
ORDER BY created_at DESC;
`
  pool.query(
    query, (error, result) => {
      if (error) {
        console.error("Error executing query", error);
        res.status(500).json({ error: "Internal Server Error" });
        return;
      }
      if (result.rows.length === 0) {
        res.json({ message: `Datan kalmamış knk` });
      } else {
        const data = result.rows;
        res.json(data);
      }
    }
  );
};

const getStats = async (req, res) => {
  try {
    const client = await pool.connect();

    // activationsTable genel istatistikleri
    const activationsCountQuery = 'SELECT COUNT(*) FROM "public"."activationstable"';
    const activationsCountResult = await client.query(activationsCountQuery);
    const totalActivations = activationsCountResult.rows[0].count;

    const activationTypesQuery = 'SELECT activationType, COUNT(*) FROM "public"."activationstable" GROUP BY   activationType';
    const activationTypesResult = await client.query(activationTypesQuery);
    const activationTypes = activationTypesResult.rows;

    const recentActivationsQuery = 'SELECT COUNT(*) FROM "public"."activationstable" WHERE created_at > NOW() - INTERVAL \'1 days\'';
    const recentActivationsResult = await client.query(recentActivationsQuery);
    const recentActivations = recentActivationsResult.rows[0].count;

    // iccidTable genel istatistikleri
    const iccidCountQuery = 'SELECT COUNT(*) FROM "public"."iccidTable"';
    const iccidCountResult = await client.query(iccidCountQuery);
    const totalIccids = iccidCountResult.rows[0].count;

    const iccidStockQuery = 'SELECT stock, COUNT(*) FROM "public"."iccidTable" GROUP BY stock';
    const iccidStockResult = await client.query(iccidStockQuery);
    const iccidStock = iccidStockResult.rows;

    // mernisTable genel istatistikleri
    const mernisCountQuery = 'SELECT COUNT(*) FROM "public"."mernisTable"';
    const mernisCountResult = await client.query(mernisCountQuery);
    const totalMernis = mernisCountResult.rows[0].count;

    const mernisTypeQuery = 'SELECT type, COUNT(*) FROM "public"."mernisTable" GROUP BY type';
    const mernisTypeResult = await client.query(mernisTypeQuery);
    const mernisTypes = mernisTypeResult.rows;

    client.release();

    res.json({
      activations: {
        total: totalActivations,
        types: activationTypes,
      },
      iccids: {
        total: totalIccids,
        stock: iccidStock
      },
      mernis: {
        total: totalMernis,
        types: mernisTypes
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Something went wrong');
  }
};

module.exports = {
  getIccid,
  setSold,
  setAvailable,
  addIccid,
  getAll,
  deleteAll,
  addActivation,
  getActivations,
  getActivationsPublic,
  getAllSpesific,
  resetIccid,
  getStats
};
