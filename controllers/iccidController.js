// iccidController.js
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const getIccid = async (req, res) => {
  const type = req.params.type;
  const used_by = req.params.sicil_no;
  try {
    const { data, error } = await supabase
      .from('iccidTable')
      .select('iccid, iccidid')
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

// const getAllSpesific = async (req, res) => {
//   const { type, stock } = req.params;
//   try {
//     const { data, error } = await supabase
//       .from('iccidTable')
//       .select('*')
//       .eq('type', type)
//       .eq('stock', stock);

//     if (error) throw error;

//     if (data.length === 0) {
//       res.json({ message: `${type} türünde ${stock} ICCID kalmamış knk` });
//     } else {
//       res.json({
//         message: `${data.length} adet ${type} türünde ${stock} ICCID bulundu`,
//         data: data
//       });
//     }
//   } catch (err) {
//     console.error("Error:", err);
//     res.status(500).json({ error: "Internal Server Error" });
//   }
// };

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

const updateIccid = async (req, res) => {
  const { iccidid, used_by, status } = req.body;

  if (!iccidid || !status) {
    return res.status(400).json({ error: "ICCID and status are required" });
  }
  const allowedStatuses = ["sold", "available", "reserved"];
  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ error: "Geçersiz status değeri" });
  }
  if (status === "sold" && !used_by) {
    return res.status(400).json({ error: "Sold status için used_by zorunlu" });
  }

  try {
    const { data, error } = await supabase
      .from('iccidTable')
      .update({ stock: status, used_by: used_by })
      .eq('iccidid', iccidid)
      .select();

if (error) throw error;

if (!data || data.length === 0) {
  return res.status(404).json({ error: `ICCID ${iccidid} not found` });
}

res.json({ message: `ICCID ${iccidid} status updated to ${status}` });
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
        prod_ofr_id,
        status: 'clean'
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
      .select(`
        *,
        gnl_parm!inner(value)
      `)
      .eq('user', user)
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (!data.length) {
      return res.json({ message: "Data çıkmamışsın knk" });
    }

    // gnl_parm nesnesinden value değerini çıkarıp ana nesneye ekle
    const formattedData = data.map(item => ({
      ...item,
      tariff_name: item.gnl_parm?.value,
      gnl_parm: undefined // gnl_parm nesnesini kaldır
    }));

    res.json(formattedData);

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

const updateActivation = async (req, res) => {
  const { activationId, status, note } = req.body;
  // activationId zorunlu, en az bir alan güncellenecek
  if (!activationId || (status === undefined && note === undefined)) {
    return res.status(400).json({
      error: "Aktivasyon ID ile birlikte en az bir güncellenecek alan (status veya note) gönderilmelidir"
    });
  }

  try {
    // Sadece gelen alanları güncelle
    const updateData = {
      updated_at: new Date().toISOString() // updated_at kolonunu güncelle
    };
    if (status !== undefined) updateData.status = status;
    if (note !== undefined) updateData.note = note;

    const { data, error } = await supabase
      .from("activationstable")
      .update(updateData)
      .eq("activationid", activationId)
      .select();  // güncellenen satırı geri al

    if (error) throw error;

    if (!data || data.length === 0) {
      return res.status(404).json({
        error: `Aktivasyon ID ${activationId} bulunamadı`
      });
    }

    res.json({
      message: `Aktivasyon güncellendi`,
      data: data[0]
    });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

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



module.exports = {
  getIccid,
  deleteAll,
  addActivation,
  getActivations,
  getActivationsPublic,
  resetIccid,
  getStats,
  formatAndInsertIccids,
  bulkDelete,
  updateIccid,
  getIccidByUserId,
  updateActivation,
  getAll
};