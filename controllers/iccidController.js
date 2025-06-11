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
    const iccidid = data.iccidid;
    // Update stock to reserved
    const { error: updateError } = await supabase
      .from('iccidTable')
      .update({ stock: 'reserved', used_by: used_by })
      .eq('iccidid', iccidid)
      .eq('type', type);

    if (updateError) throw updateError;

    res.json({iccidid, iccid});
    // Handle reservation timeout
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const getIccidByUserId = async (req, res) => {
  const { used_by } = req.params;
  try {
    // Önce ICCID'leri çek
    const { data: iccidData, error: iccidError } = await supabase
      .from('iccidTable')
      .select('*')
      .eq('used_by', used_by)
      .order('updated_at', { ascending: false })

    if (iccidError) throw iccidError;

    if (iccidData.length === 0) {
      res.json({ message: `${used_by} kullanıcısı hiç iccid kullanmamış` });
    } else {
      // Kullanıcı bilgilerini çek
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('sicil_no, full_name')
        .in('sicil_no', [...new Set(iccidData.map(i => [i.added_by, i.used_by]).flat())]);

      if (usersError) throw usersError;

      // Kullanıcı bilgilerini map'le
      const userMap = usersData.reduce((acc, user) => {
        acc[user.sicil_no] = user.full_name;
        return acc;
      }, {});

      // Verileri birleştir
      const formattedData = iccidData.map(item => ({
        ...item,
        added_by_name: userMap[item.added_by] || 'Bilinmeyen Kullanıcı',
        used_by_name: userMap[item.used_by] || 'Bilinmeyen Kullanıcı'
      }));

      res.json({
        message: ` ${used_by} kullanıcısına ait ${iccidData.length} adet ICCID bulundu`,
        data: formattedData
      });
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
    // Sadece gelen alanları güncelle
    const updateData = {
      updated_at: new Date().toISOString()
    };
    updateData.stock = status;
    if (used_by) updateData.used_by = used_by;

    const { data, error } = await supabase
      .from('iccidTable')
      .update(updateData)
      .eq('iccidid', iccidid)
      .select();

    if (error) throw error;

    if (!data || data.length === 0) {
      return res.status(404).json({ error: `ICCID ${iccidid} not found` });
    }

    res.json({
      message: `ICCID ${iccidid} status updated to ${status}`,
      data: data[0]
    });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const getAll = async (req, res) => {
  try {
    // Önce ICCID'leri çek
    const { data: iccidData, error: iccidError } = await supabase
      .from('iccidTable')
      .select('*');

    if (iccidError) throw iccidError;

    if (iccidData.length === 0) {
      res.json({ message: "ICCID kalmamış knk" });
    } else {
      // Kullanıcı bilgilerini çek
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('sicil_no, full_name')
        .in('sicil_no', [...new Set(iccidData.map(i => [i.added_by, i.used_by]).flat())]);

      if (usersError) throw usersError;

      // Kullanıcı bilgilerini map'le
      const userMap = usersData.reduce((acc, user) => {
        acc[user.sicil_no] = user.full_name;
        return acc;
      }, {});

      // Verileri birleştir
      const formattedData = iccidData.map(item => ({
        ...item,
        added_by_name: userMap[item.added_by] || 'Bilinmeyen Kullanıcı',
        used_by_name: userMap[item.used_by] || 'Bilinmeyen Kullanıcı'
      }));

      res.json(formattedData);
    }
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
    // Önce aktivasyonları çek
    const { data: activationsData, error: activationsError } = await supabase
      .from('activationstable')
      .select('*')
      .eq('user', user)
      .order('created_at', { ascending: false });

    if (activationsError) throw activationsError;

    if (!activationsData.length) {
      return res.json({ message: "Data çıkmamışsın knk" });
    }

    // Kullanıcı bilgilerini çek
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('sicil_no, full_name')
      .in('sicil_no', activationsData.map(a => a.user));

    if (usersError) throw usersError;

    // Tarife bilgilerini çek
    const { data: tariffData, error: tariffError } = await supabase
      .from('gnl_parm')
      .select('id, value')
      .in('id', activationsData.map(a => a.prod_ofr_id));

    if (tariffError) throw tariffError;

    // Kullanıcı bilgilerini map'le
    const userMap = usersData.reduce((acc, user) => {
      acc[user.sicil_no] = user.full_name;
      return acc;
    }, {});

    // Tarife bilgilerini map'le
    const tariffMap = tariffData.reduce((acc, tariff) => {
      acc[tariff.id] = tariff.value;
      return acc;
    }, {});

    // Verileri birleştir
    const formattedData = activationsData.map(item => ({
      ...item,
      tariff_name: tariffMap[item.prod_ofr_id] || 'Bilinmeyen Tarife',
      full_name: userMap[item.user] || 'Bilinmeyen Kullanıcı'
    }));

    res.json(formattedData);

  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const getActivationsPublic = async (req, res) => {
  try {
    // Önce aktivasyonları çek
    const { data: activationsData, error: activationsError } = await supabase
      .from('activationstable')
      .select('*')
      .order('created_at', { ascending: false });

    if (activationsError) throw activationsError;

    if (activationsData.length === 0) {
      return res.json({ message: "Datan kalmamış knk" });
    }

    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('sicil_no, full_name')
      .in('sicil_no', activationsData.map(a => a.user));

    if (usersError) throw usersError;

    // Tarife bilgilerini çek
    const { data: tariffData, error: tariffError } = await supabase
      .from('gnl_parm')
      .select('id, value')
      .in('id', activationsData.map(a => a.prod_ofr_id));

    if (tariffError) throw tariffError;

    // Kullanıcı bilgilerini map'le
    const userMap = usersData.reduce((acc, user) => {
      acc[user.sicil_no] = user.full_name;
      return acc;
    }, {});

    // Tarife bilgilerini map'le
    const tariffMap = tariffData.reduce((acc, tariff) => {
      acc[tariff.id] = tariff.value;
      return acc;
    }, {});

    // Verileri birleştir
    const formattedData = activationsData.map(item => ({
      ...item,
      tariff_name: tariffMap[item.prod_ofr_id] || 'Bilinmeyen Tarife',
      full_name: userMap[item.user] || 'Bilinmeyen Kullanıcı'
    }));

    res.json(formattedData);
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
    // 1) Tüm gerekli alanları ve toplam sayıyı tek seferde çek
    const { data, count: totalActivations, error } = await supabase
      .from('activationstable')
      .select('user, created_at, activationtype, status, prod_ofr_id', { count: 'exact' });
    if (error) throw error;

    // 2) Mevcut metrik objeleri
    const activationsByUser     = {};
    const activationsByDay      = {};
    const activationsByType     = {};
    const activationsByStatus   = {};
    const activationsByProduct  = {};
    const activationsByUserDay  = {};
    const activationsByProdType = {};  // <-- yeni ek

    // 3) Döngüde tüm sayımları yap
    data.forEach(({ user, created_at, activationtype, status, prod_ofr_id }) => {
      const day = new Date(created_at).toISOString().slice(0,10);

      // kullanıcı bazlı
      activationsByUser[user] = (activationsByUser[user] || 0) + 1;
      // gün bazlı
      activationsByDay[day] = (activationsByDay[day] || 0) + 1;
      // tip bazlı
      activationsByType[activationtype] = (activationsByType[activationtype] || 0) + 1;
      // durum bazlı
      activationsByStatus[status] = (activationsByStatus[status] || 0) + 1;
      // ürün bazlı
      activationsByProduct[prod_ofr_id] = (activationsByProduct[prod_ofr_id] || 0) + 1;
      // gün–kullanıcı kırılımı
      activationsByUserDay[day] = activationsByUserDay[day] || {};
      activationsByUserDay[day][user] = (activationsByUserDay[day][user] || 0) + 1;

      // ürün×tip bazlı: önce obje hiyerarşisini kur
      activationsByProdType[prod_ofr_id] = activationsByProdType[prod_ofr_id] || {};
      const bucket = activationsByProdType[prod_ofr_id];

      bucket[activationtype] = bucket[activationtype] || { count: 0, users: new Set() };
      bucket[activationtype].count++;
      bucket[activationtype].users.add(user);
    });

    // 4) Set’leri array’e çevir
    Object.values(activationsByProdType).forEach(typeMap => {
      Object.values(typeMap).forEach(entry => {
        entry.users = Array.from(entry.users);
      });
    });

    // 5) Ortalama gibi diğer metrikleri de eklemek istersen buraya…

    // 6) Sonuçları dön
    res.json({
      totalActivations,
      activations: {
        byUser:       activationsByUser,
        byDay:        activationsByDay,
        byType:       activationsByType,
        byStatus:     activationsByStatus,
        byProduct:    activationsByProduct,
        byUserDay:    activationsByUserDay,
        byProdType:   activationsByProdType
      }
    });
  } catch (err) {
    console.error("Error in getStats:", err);
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