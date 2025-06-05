// iccidController.js
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const getIccid = async (req, res) => {
  const type = req.params.type;
  const used_by = req.params.sicil_no;
  try {
    // Get parameters from gnl_parm table
    const { data: paramData, error: paramError } = await supabase
      .from('gnl_parm')
      .select('param_name, param_value')
      .in('param_name', ['reservation_timeout', 'reservation_enabled']);

    if (paramError) throw paramError;

    const params = {};
    paramData.forEach(row => {
      params[row.param_name] = row.param_value;
    });

    const reservationTimeout = parseInt(params['reservation_timeout'], 10);
    const reservationEnabled = params['reservation_enabled'] === 'true';

    // Get available ICCID
    const { data, error } = await supabase
      .from('iccidTable')
      .select('iccid')
      .eq('stock', 'available')
      .eq('type', type)
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: `${type} türünde ICCID kalmamış knk` });
      }
      throw error;
    }

    const iccid = data.iccid;

    // Update stock to reserved
    const { error: updateError } = await supabase
      .from('iccidTable')
      .update({ stock: 'reserved', used_by: used_by })
      .eq('iccid', iccid)
      .eq('type', type);

    if (updateError) throw updateError;

    res.json(iccid);
    // Handle reservation timeout
    if (reservationEnabled) {
      setTimeout(async () => {
        const { data: checkData } = await supabase
          .from('iccidTable')
          .select('stock')
          .eq('iccid', iccid)
          .eq('stock', 'reserved')
          .single();

        if (checkData) {
          const { error: resetError } = await supabase
            .from('iccidTable')
            .update({ stock: 'available' })
            .eq('iccid', iccid);

          if (resetError) {
            console.error("Error setting stock to available", resetError);
          } else {
            console.log(`ICCID ${iccid} is now available again`);
          }
        }
      }, reservationTimeout || 300000);
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
      .from('iccidTable')
      .select('*')
      .eq('type', type)
      .eq('stock', stock);

    if (error) throw error;

    if (data.length === 0) {
      res.json({ message: `${type} türünde ${stock} ICCID kalmamış knk` });
    } else {
      res.json({
        message: `${data.length} adet ${type} türünde ${stock} ICCID bulundu`,
        data: data
      });
    }
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const getIccidByUserId = async (req, res) => {
  const { used_by } = req.params;
  try {
    const { data, error } = await supabase
      .from('iccidTable')
      .select('*')
      .eq('used_by', used_by)
      .order('updated_at', { ascending: false })

    if (error) throw error;

    if (data.length === 0) {
      res.json({ message: `${used_by} kullanıcısı hiç iccid kullanmamış` });
    } else {
      res.json({
        message: ` ${used_by} kullanıcısına ait ${data.length} adet ICCID bulundu`,
        data: data
      });
    }
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const getAll = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('iccidTable')
      .select('*');

    if (error) throw error;

    if (data.length === 0) {
      res.json({ message: "ICCID kalmamış knk" });
    } else {
      res.json(data);
    }
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const setSold = async (req, res) => {
  const { iccid, used_by } = req.body;
  if (!iccid) {
    return res.status(400).json({ error: "ICCID is required" });
  }
  try {
    const { error } = await supabase
      .from('iccidTable')
      .update({ stock: 'sold', used_by: used_by })
      .eq('iccid', iccid);

    if (error) throw error;

    res.json({ message: `ICCID ${iccid} has been sold by ${used_by}` });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const setAvailable = async (req, res) => {
  const { iccid } = req.body;
  if (!iccid) {
    return res.status(400).json({ error: "ICCID is required" });
  }

  try {
    const { error } = await supabase
      .from('iccidTable')
      .update({ stock: 'available' })
      .eq('iccid', iccid);

    if (error) throw error;

    res.json({ message: `ICCID ${iccid} is now available` });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const setStatus = async (req, res) => {
  const { iccid, status } = req.body;

  if (!iccid || !status) {
    return res.status(400).json({ error: "ICCID and status are required" });
  }

  try {
    const { data, error } = await supabase
      .from('iccidTable')
      .update({ stock: status })
      .eq('iccid', iccid)
      .select();   // güncellenen satırları almak için ekle

if (error) throw error;
console.log(data);
if (!data || data.length === 0) {
  // Güncellenecek satır bulunamadı
  return res.status(404).json({ error: `ICCID ${iccid} not found` });
}

res.json({ message: `ICCID ${iccid} status updated to ${status}` });
  } catch (err) {
  console.error("Error:", err);
  res.status(500).json({ error: "Internal Server Error" });
}
};


function formatICCID(input) {
  let cleanedInput = input.replace(/\s+/g, '');
  let iccids = cleanedInput.match(/.{1,20}/g);
  return iccids;
}

const addIccid = async (req, res) => {
  const iccids = formatICCID(req.body);
  const iccidType = req.params.type;

  if (!iccids || !iccidType) {
    return res.status(400).json({ error: "ICCID'ler ve ICCID tipi gereklidir" });
  }

  try {
    const iccidData = iccids.map(iccid => ({
      iccid,
      stock: 'available',
      type: iccidType
    }));

    const { error } = await supabase
      .from('iccidTable')
      .insert(iccidData);

    if (error) throw error;

    res.json({ message: "ICCID'ler başarıyla eklendi" });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const deleteAll = async (req, res) => {
  try {
    const { error } = await supabase
      .from('iccidTable')
      .delete()
      .in('stock', ['sold', 'reserved']);

    if (error) throw error;

    res.json({ message: "Reserved ve sold ICCID'ler silindi" });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const resetIccid = async (req, res) => {
  try {
    const { error } = await supabase
      .from('iccidTable')
      .delete()
      .neq('iccid', ''); // Delete all records

    if (error) throw error;

    res.json({ message: "Tüm ICCID'ler silindi" });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const addActivation = async (req, res) => {
  const { msisdn, tckn, birth_date, activationtype, user, iccid, prod_ofr_id } = req.body;
  console.log(req.body);
  if (!msisdn || !tckn || !birth_date || !activationtype) {
    return res.status(400).json({
      error: `${!msisdn ? 'msisdn' : !tckn ? 'tckn' : !birth_date ? 'birth_date' : 'activationType'} alanı doldurulmadı`
    });
  }

  try {
    const { error } = await supabase
      .from('activationstable')
      .insert([{
        msisdn,
        tckn,
        birth_date,
        activationtype,
        user,
        created_at: new Date().toISOString(),
        iccid,
        prod_ofr_id
      }]);

    if (error) throw error;

    res.json({ message: "Data Db'ye başarıyla eklendi" });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const getActivations = async (req, res) => {
  const { user } = req.params;

  try {
    const { data, error } = await supabase
      .from('activationstable')
      .select('*')
      .eq('user', user)
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (data.length === 0) {
      res.json({ message: "Datan kalmamış knk" });
    } else {
      res.json(data);
    }
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const getActivationsPublic = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('activationstable')
      .select('*')
      .not('user', 'in', '(alp, enes)')
      .order('created_at', { ascending: false });
    if (error) throw error;

    if (data.length === 0) {
      res.json({ message: "Datan kalmamış knk" });
    } else {
      res.json(data);
    }
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const getStats = async (req, res) => {
  try {
    // Get activations statistics
    const { data: activationsData, error: activationsError } = await supabase
      .from('activationstable')
      .select('activationType');

    if (activationsError) throw activationsError;

    const totalActivations = activationsData.length;

    // Group by activationType
    const activationTypes = activationsData.reduce((acc, curr) => {
      acc[curr.activationType] = (acc[curr.activationType] || 0) + 1;
      return acc;
    }, {});

    // Get ICCID statistics
    const { data: iccidData, error: iccidError } = await supabase
      .from('iccidTable')
      .select('stock');

    if (iccidError) throw iccidError;

    const totalIccids = iccidData.length;

    // Group by stock status
    const iccidStock = iccidData.reduce((acc, curr) => {
      acc[curr.stock] = (acc[curr.stock] || 0) + 1;
      return acc;
    }, {});

    // Get Mernis statistics
    const { data: mernisData, error: mernisError } = await supabase
      .from('mernisTable')
      .select('stock');

    if (mernisError) throw mernisError;

    const totalMernis = mernisData.length;

    // Group by stock status
    const mernisTypes = mernisData.reduce((acc, curr) => {
      acc[curr.stock] = (acc[curr.stock] || 0) + 1;
      return acc;
    }, {});

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
    console.error("Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const reservedToAvailable = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('iccidTable')
      .update({ stock: 'available' })
      .eq('stock', 'reserved');

    if (error) throw error;

    res.json({ message: `Reserved entries changed to available` });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Format ICCID helper function
const formatIccid = async (req, res) => {
  try {
    const iccidText = req.body;

    if (typeof iccidText !== 'string') {
      return res.status(400).json({ error: 'iccidText should be a string' });
    }

    const iccidArray = iccidText.split(/\r?\n/)
      .map(iccid => iccid.trim())
      .filter(iccid => iccid !== '');

    const formattedIccids = {
      iccids: iccidArray,
      type: 'fonkpos'
    };

    res.json(formattedIccids);
  } catch (error) {
    console.error("Error in formatIccid function:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Format and insert ICCIDs
const formatAndInsertIccids = async (req, res) => {
  try {
    const iccidText = req.body;

    if (typeof iccidText !== 'string') {
      return res.status(400).json({ error: 'iccidText should be a string' });
    }

    const iccidArray = iccidText.split(/\r?\n/)
      .map(iccid => iccid.trim())
      .filter(iccid => iccid !== '');

    const type = req.params.type || 'defaultType';
    const sicil_no = req.params.sicil_no;
    const iccidsToInsert = iccidArray.map(iccid => ({
      iccid: iccid,
      stock: 'available',
      type: type,
      added_by: sicil_no
    }));

    const { error } = await supabase
      .from('iccidTable')
      .insert(iccidsToInsert);

    if (error) throw error;

    res.json({ message: "ICCID'ler başarıyla eklendi" });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const bulkDelete = async (req, res) => {
  const { iccids } = req.body;

  if (!Array.isArray(iccids) || iccids.length === 0) {
    return res.status(400).json({ error: 'Geçerli ICCID listesi gönderilmedi' });
  }

  try {
    const { data, error } = await supabase
      .from('iccidTable')
      .delete()
      .in('iccid', iccids)
      .select();

    if (error) throw error;

    res.json({
      message: `${data.length} ICCID başarıyla silindi`,
      deletedIccids: data
    });
  } catch (error) {
    console.error('ICCID silme hatası:', error);
    res.status(500).json({ error: 'ICCID silinirken bir hata oluştu' });
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
  getStats,
  reservedToAvailable,
  formatIccid,
  formatAndInsertIccids,
  bulkDelete,
  setStatus,
  getIccidByUserId
};