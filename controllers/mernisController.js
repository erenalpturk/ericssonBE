// const { Pool } = require("pg");
// const connectionString = process.env.CONNECTION_URL;
// const pool = new Pool({ connectionString });

// const getMernis = async (req, res) => {
//     const type = req.params.type;
//     const query = `SELECT tckn, birth_date FROM "public"."mernisTable" WHERE stock = 'available' and type= '${type}' LIMIT 1;`;
//     pool.query(
//         query, (error, result) => {
//             if (error) {
//                 console.error("Error executing query", error);
//                 res.status(500).json({ error: "Internal Server Error" });
//                 return;
//             }
//             if (result.rows.length === 0) {
//                 res.json({ message: `${type} kalmamış knk` });
//             } else {
//                 const mernis = result.rows[0];
//                 res.json(mernis);
//                 pool.query(
//                     `UPDATE "public"."mernisTable" SET stock= 'sold' WHERE tckn = '${mernis.tckn}'`,
//                 )
//             }
//         }
//     );
// };

// const getAll = async (req, res) => {
//     pool.query(
//         `SELECT * FROM "public"."mernisTable"`,
//         (error, result) => {
//             if (error) {
//                 console.error("Error executing query", error);
//                 res.status(500).json({ error: "Internal Server Error" });
//                 return;
//             }
//             if (result.rows.length === 0) {
//                 res.json({ message: "Mernis kalmamış knk" });
//             } else {
//                 res.json(result.rows);
//             }
//         }
//     );
// };

// const getAllSpesific = async (req, res) => {
//     const type = req.params.type;
//     const stock = req.params.stock;
//     pool.query(
//       `SELECT * FROM "public"."mernisTable" WHERE type = '${type}' AND stock = '${stock}'`,
//       (error, result) => {
//         if (error) {
//           console.error("Error executing query", error);
//           res.status(500).json({ error: "Internal Server Error" });
//           return;
//         }
  
//         if (result.rows.length === 0) {
//           res.json({ message: `${type} türünde ${stock} mernis kalmamış knk` });
//         } else {
  
//           res.json({
//             message: `${result.rows.length} adet ${type} türünde ${stock} mernis bulundu`,
//             data: result.rows
//           });
//         }
//       }
//     );
// };

// const deleteSold = async (req, res) => {
//     const query = `DELETE FROM "public"."mernisTable" WHERE stock = 'sold'`;
//     pool.query(query, (error, result) => {
//         if (error) {
//             console.error("Error executing query", error);
//             res.status(500).json({ error: "Internal Server Error" });
//             return;
//         }
//         res.json({ message: "Kullanılmış mernis'ler silindi" });
//     });
// };

// const addMernis = async (req, res) => {
//     const mernisData = req.body.mernisData;
//     if (!mernisData) {
//         res.status(400).json({ error: "Mernis verisi gereklidir" });
//         return;
//     }

//     // Verileri uygun formata dönüştürme
//     const values = mernisData.map(data => `('${data.tckn}', '${data.birth_date}', '${data.type}', '${data.stock}')`).join(',');

//     const query = `
//       INSERT INTO "public"."mernisTable" (tckn, birth_date, type, stock)
//       VALUES ${values};
//     `;

//     pool.query(query, (error, result) => {
//         if (error) {
//             console.error("Query hatası", error);
//             res.status(500).json({ error: "Sunucu Hatası" });
//             return;
//         }
//         res.json({ message: "Mernis verileri başarıyla eklendi" });
//     });
// };

// const resetMernis = async (req, res) => {
//     const query = `DELETE FROM "public"."mernisTable";`;
  
//     pool.query(query, (error, result) => {
//       if (error) {
//         console.error("Error executing query", error);
//         res.status(500).json({ error: "Internal Server Error" });
//         return;
//       }
//       res.json({ message: "Tüm Mernis'ler silindi" });
//     });
//   };

//   const useSql = async (req, res) => {
//     const query = req.body.query
  
//     pool.query(query, (error, result) => {
//       if (error) {
//         console.error("Error executing query", error);
//         res.status(500).json({ error: "Internal Server Error" });
//         return;
//       }
//       res.json(result.rows);
//       console.log(result);
//     });
//   };


// const parseMernisData = (input, input2) => {
//     const records = input.split('------------------------------------')
//                         .map(record => record.trim())
//                         .filter(record => record.length > 0);

//     return records.map(record => {
//         const lines = record.split('\n').map(line => line.trim());
//         const birthDateLine = lines.find(line => line.startsWith('DOĞUM TARİHİ'));
//         const tcknLine = lines.find(line => line.startsWith('TCKN'));

//         let birthDate = birthDateLine.split(':')[1].trim().replace(/\//g, '.');

//         // Adjusting the birthDate format to remove leading zeros
//         birthDate = birthDate.split('.').map(part => part.length === 1 ? `0${part}` : part).join('.');

//         const tckn = tcknLine.split(':')[1].trim();

//         return {
//             tckn: tckn,
//             birth_date: birthDate,
//             type: input2,
//             stock: 'available'
//         };
//     });
// };


// const mernisData = async (req, res) => {
//     try { console.log(req.params);
//         const data = parseMernisData(req.body,req.params.type);

//         const client = await pool.connect();
//         try {
//             await client.query('BEGIN');
//             const queryText = 'INSERT INTO "public"."mernisTable" (tckn, birth_date, type, stock) VALUES ($1, $2, $3, $4)';
//             for (const record of data) {
//                 await client.query(queryText, [record.tckn, record.birth_date,req.params.type, record.stock]);
//             }
//             await client.query('COMMIT');
//         } catch (error) {
//             await client.query('ROLLBACK');
//             throw error;
//         } finally {
//             client.release();
//         }

//         res.status(201).json({ mernisData: data });
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ error: 'Internal Server Error' });
//     }
// };

// module.exports = {
//     getMernis,
//     getAll,
//     deleteSold,
//     addMernis,
//     resetMernis,
//     getAllSpesific,
//     mernisData,
//     useSql
// };


// mernisController.js
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const getMernis = async (req, res) => {
  const type = req.params.type;
  
  try {
    const { data, error } = await supabase
      .from('mernisTable')
      .select('tckn, birth_date')
      .eq('stock', 'available')
      .eq('type', type)
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.json({ message: `${type} kalmamış knk` });
      }
      throw error;
    }

    res.json(data);

    // Update the stock status to 'sold'
    const { error: updateError } = await supabase
      .from('mernisTable')
      .update({ stock: 'sold' })
      .eq('tckn', data.tckn);

    if (updateError) {
      console.error("Error updating stock:", updateError);
    }
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const getAll = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('mernisTable')
      .select('*');

    if (error) throw error;

    if (data.length === 0) {
      res.json({ message: "Mernis kalmamış knk" });
    } else {
      res.json(data);
    }
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const getAllSpesific = async (req, res) => {
  const { type, stock } = req.params;
  
  try {
    const { data, error } = await supabase
      .from('mernisTable')
      .select('*')
      .eq('type', type)
      .eq('stock', stock);

    if (error) throw error;

    if (data.length === 0) {
      res.json({ message: `${type} türünde ${stock} mernis kalmamış knk` });
    } else {
      res.json({
        message: `${data.length} adet ${type} türünde ${stock} mernis bulundu`,
        data: data
      });
    }
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const deleteSold = async (req, res) => {
  try {
    const { error } = await supabase
      .from('mernisTable')
      .delete()
      .eq('stock', 'sold');

    if (error) throw error;

    res.json({ message: "Kullanılmış mernis'ler silindi" });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const addMernis = async (req, res) => {
  const { mernisData } = req.body;
  
  if (!mernisData) {
    return res.status(400).json({ error: "Mernis verisi gereklidir" });
  }

  try {
    const { error } = await supabase
      .from('mernisTable')
      .insert(mernisData.map(data => ({
        tckn: data.tckn,
        birth_date: data.birth_date,
        type: data.type,
        stock: data.stock
      })));

    if (error) throw error;

    res.json({ message: "Mernis verileri başarıyla eklendi" });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const resetMernis = async (req, res) => {
  try {
    const { error } = await supabase
      .from('mernisTable')
      .delete()
      .neq('tckn', ''); // Delete all records

    if (error) throw error;

    res.json({ message: "Tüm Mernis'ler silindi" });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
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
    birthDate = birthDate.split('.')
      .map(part => part.length === 1 ? `0${part}` : part)
      .join('.');

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
  try {
    console.log(req.params);
    const data = parseMernisData(req.body, req.params.type);

    const { error } = await supabase
      .from('mernisTable')
      .insert(data.map(record => ({
        tckn: record.tckn,
        birth_date: record.birth_date,
        type: req.params.type,
        stock: record.stock
      })));

    if (error) throw error;

    res.status(201).json({ mernisData: data });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Note: useSql function is removed as it's not recommended to use raw SQL with Supabase
// Instead, use Supabase's query builder methods for better security and type safety

module.exports = {
  getMernis,
  getAll,
  deleteSold,
  addMernis,
  resetMernis,
  getAllSpesific,
  mernisData
};