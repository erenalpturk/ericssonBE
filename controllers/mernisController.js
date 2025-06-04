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