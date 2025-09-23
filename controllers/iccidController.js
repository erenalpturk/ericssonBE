// iccidController.js
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const getIccid = async (req, res) => {
  const type = req.params.type;
  const used_by = req.params.sicil_no;
  const count = req.params.count || 1;

  try {
    const { data, error } = await supabase
      .from('iccidTable')
      .select('iccid, iccidid')
      .eq('stock', 'available')
      .eq('type', type)
      .limit(count)
    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: `${type} türünde ICCID kalmamış knk` });
      }
      throw error;
    }
    // data artık array olabilir
    if (!data || (Array.isArray(data) && data.length === 0)) {
      return res.status(404).json({ error: `${type} türünde ICCID kalmamış` });
    }

    // data array ise, her biri için update yap
    let iccidList = Array.isArray(data) ? data : [data];
    for (const row of iccidList) {
      if (!row.iccidid) {
        return res.status(500).json({ error: 'iccidid eksik' });
      }
      const { error: updateError } = await supabase
        .from('iccidTable')
        .update({ stock: 'reserved', used_by: used_by })
        .eq('iccidid', row.iccidid)
        .eq('type', type);
      if (updateError) throw updateError;
    }

    res.json(iccidList);
    // Handle reservation timeout
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const getIccidNew = async (req, res) => {
  const { environment, gsm_type, dealer, sicil_no, count } = req.params;
  try {
    const { data, error } = await supabase
      .from('iccidTable')
      .select('iccid, iccidid')
      .eq('stock', 'available')
      .eq('environment', environment)
      .eq('gsm_type', gsm_type)
      .eq('dealer', dealer)
      .limit(count)
    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: `${gsm_type} türünde ICCID kalmamış knk` });
      }
      throw error;
    }
    // data artık array olabilir
    if (!data || (Array.isArray(data) && data.length === 0)) {
      return res.status(404).json({ error: `${dealer} için ${gsm_type} türünde ICCID kalmamış` });
    }

    // data array ise, her biri için update yap
    let iccidList = Array.isArray(data) ? data : [data];
    for (const row of iccidList) {
      if (!row.iccidid) {
        return res.status(500).json({ error: 'iccidid eksik' });
      }
      const { error: updateError } = await supabase
        .from('iccidTable')
        .update({ stock: 'reserved', used_by: sicil_no, environment: environment, updated_at: new Date().toISOString() })
        .eq('iccidid', row.iccidid)
        .eq('gsm_type', gsm_type)
        .eq('dealer', dealer);
      if (updateError) throw updateError;
    }

    res.json(iccidList);
    // Handle reservation timeout
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
}

const iccidCountByDealer = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('iccidTable')
      .select('dealer')
      .eq('stock', 'available');

    if (error) throw error;

    // JS tarafında gruplama + sayma
    const counts = data.reduce((acc, row) => {
      acc[row.dealer] = (acc[row.dealer] || 0) + 1;
      return acc;
    }, {});

    const dealerCounts = Object.entries(counts).map(([dealer, count]) => ({
      dealer,
      count,
    }));

    res.json(dealerCounts);
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

    // İade: available olduğunda used_by = added_by yapılır
    if (status === 'available') {
      const { data: currentRows, error: fetchError } = await supabase
        .from('iccidTable')
        .select('added_by')
        .eq('iccidid', iccidid)
        .limit(1);
      if (fetchError) throw fetchError;
      if (!currentRows || currentRows.length === 0) {
        return res.status(404).json({ error: `ICCID ${iccidid} not found` });
      }
      updateData.used_by = currentRows[0].added_by ?? null;
    } else if (typeof used_by !== 'undefined') {
      // Diğer durumlarda frontend'ten gelmişse used_by'yı güncelle
      updateData.used_by = used_by;
    }

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

const updateSetIccid = async (req, res) => {
  const { set_table_id, status } = req.body;
  try {
    const { data, error } = await supabase
      .from('iccidTable')
      .update({ stock: status })
      .eq('set_table_id', set_table_id);
    if (error) throw error;
    res.json({ message: `${set_table_id} için iccidlerin statüsü ${status} olarak güncellendi` });
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

const getIccidByAddedByUserId = async (req, res) => {
  const { added_by } = req.params;
  try {
    // Önce ilgili set'e ait ICCID'leri çek
    const { data: iccidData, error: iccidError } = await supabase
      .from('iccidTable')
      .select('*')
      .eq('added_by', added_by);

    if (iccidError) throw iccidError;

    if (iccidData.length === 0) {
      res.json({ message: "Bu kullanıcıya ait ICCID yok knk" });
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

const getIccidBySet = async (req, res) => {
  const { set_id } = req.params;
  try {
    // Önce ilgili set'e ait ICCID'leri çek
    const { data: iccidData, error: iccidError } = await supabase
      .from('iccidTable')
      .select('*')
      .eq('set_table_id', set_id);

    if (iccidError) throw iccidError;

    if (iccidData.length === 0) {
      res.json({ message: "Bu set'e ait ICCID yok knk" });
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
  const { msisdn, tckn, birth_date, activationtype, user, iccid, prod_ofr_id, isAutomation } = req.body;
  if (!msisdn || !activationtype || !prod_ofr_id || !user) {
    return res.status(400).json({
      error: `${!msisdn ? 'msisdn' : !activationtype ? 'activationType' : !prod_ofr_id ? 'prod_ofr_id' : !user ? 'user' : ''} alanı doldurulmadı`
    });
  }
  const isAutomationValue = isAutomation === 0 ? 0 : 1;
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
        status: 'clean',
        isAutomation: isAutomationValue
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
    // Önce aktivasyonları çek - hem kendi dataları hem de transfer edilenler
    const { data: activationsData, error: activationsError } = await supabase
      .from('activationstable')
      .select('*')
      .or(`user.eq.${user},transfer_user->>current_user.eq.${user}`)
      .order('created_at', { ascending: false });

    if (activationsError) throw activationsError;

    if (!activationsData.length) {
      return res.json({ message: "Data çıkmamışsın knk" });
    }

    // Tüm kullanıcı sicil numaralarını topla (user + transfer_user'lardan)
    const allUserSicils = new Set();
    activationsData.forEach(a => {
      allUserSicils.add(a.user);
      if (a.transfer_user?.transfers) {
        a.transfer_user.transfers.forEach(t => {
          allUserSicils.add(t.from);
          allUserSicils.add(t.to);
        });
      }
      if (a.transfer_user?.original_user) allUserSicils.add(a.transfer_user.original_user);
      if (a.transfer_user?.current_user) allUserSicils.add(a.transfer_user.current_user);
    });

    // Kullanıcı bilgilerini çek
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('sicil_no, full_name')
      .in('sicil_no', Array.from(allUserSicils));

    if (usersError) throw usersError;

    // Debug: Eksik kullanıcıları logla
    const foundUserSicils = usersData.map(u => u.sicil_no);
    const missingUsers = Array.from(allUserSicils).filter(sicil => !foundUserSicils.includes(sicil));
    if (missingUsers.length > 0) {
      console.warn('⚠️ Kullanıcı tablosunda bulunamayan sicil numaraları:', missingUsers);
    }

    // Tarife bilgilerini çek
    const { data: tariffData, error: tariffError } = await supabase
      .from('gnl_parm')
      .select('value, name')
      .in('value', activationsData.map(a => a.prod_ofr_id));

    if (tariffError) throw tariffError;

    // Kullanıcı bilgilerini map'le
    const userMap = usersData.reduce((acc, user) => {
      acc[user.sicil_no] = user.full_name;
      return acc;
    }, {});

    // Tarife bilgilerini map'le
    const tariffMap = tariffData.reduce((acc, tariff) => {
      acc[tariff.value] = tariff.name;
      return acc;
    }, {});

    // Verileri birleştir - transfer durumunu kontrol et
    const formattedData = activationsData.map(item => {
      // Eğer transfer edilmişse, current_user'ı kullan
      const currentUser = item.transfer_user?.current_user || item.user;

      return {
        ...item,
        tariff_name: tariffMap[item.prod_ofr_id] || 'Bilinmeyen Tarife',
        full_name: userMap[currentUser] || 'Bilinmeyen Kullanıcı',
        current_owner: currentUser,
        original_owner: item.transfer_user?.original_user || item.user,
        original_owner_name: userMap[item.transfer_user?.original_user || item.user] || 'Bilinmeyen Kullanıcı',
        transfer_user: item.transfer_user ? {
          ...item.transfer_user,
          transfers: item.transfer_user.transfers?.map(transfer => ({
            ...transfer,
            from_name: userMap[transfer.from] || transfer.from,
            to_name: userMap[transfer.to] || transfer.to
          })) || []
        } : null
      };
    });

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

    // Tüm kullanıcı sicil numaralarını topla (user + transfer_user'lardan)
    const allUserSicils = new Set();
    activationsData.forEach(a => {
      allUserSicils.add(a.user);
      if (a.transfer_user?.transfers) {
        a.transfer_user.transfers.forEach(t => {
          allUserSicils.add(t.from);
          allUserSicils.add(t.to);
        });
      }
      if (a.transfer_user?.original_user) allUserSicils.add(a.transfer_user.original_user);
      if (a.transfer_user?.current_user) allUserSicils.add(a.transfer_user.current_user);
    });

    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('sicil_no, full_name')
      .in('sicil_no', Array.from(allUserSicils));

    if (usersError) throw usersError;

    // Debug: Eksik kullanıcıları logla (Public endpoint)
    const foundUserSicils = usersData.map(u => u.sicil_no);
    const missingUsers = Array.from(allUserSicils).filter(sicil => !foundUserSicils.includes(sicil));
    if (missingUsers.length > 0) {
      console.warn('⚠️ [Public] Kullanıcı tablosunda bulunamayan sicil numaraları:', missingUsers);
    }

    // Tarife bilgilerini çek
    const { data: tariffData, error: tariffError } = await supabase
      .from('gnl_parm')
      .select('value, name')
      .in('value', activationsData.map(a => a.prod_ofr_id));

    if (tariffError) throw tariffError;

    // Kullanıcı bilgilerini map'le
    const userMap = usersData.reduce((acc, user) => {
      acc[user.sicil_no] = user.full_name;
      return acc;
    }, {});

    // Tarife bilgilerini map'le
    const tariffMap = tariffData.reduce((acc, tariff) => {
      acc[tariff.value] = tariff.name;
      return acc;
    }, {});

    // Verileri birleştir - transfer durumunu kontrol et
    const formattedData = activationsData.map(item => {
      // Eğer transfer edilmişse, current_user'ı kullan
      const currentUser = item.transfer_user?.current_user || item.user;

      return {
        ...item,
        tariff_name: tariffMap[item.prod_ofr_id] || 'Bilinmeyen Tarife',
        full_name: userMap[currentUser] || 'Bilinmeyen Kullanıcı',
        current_owner: currentUser,
        original_owner: item.transfer_user?.original_user || item.user,
        original_owner_name: userMap[item.transfer_user?.original_user || item.user] || 'Bilinmeyen Kullanıcı',
        transfer_user: item.transfer_user ? {
          ...item.transfer_user,
          transfers: item.transfer_user.transfers?.map(transfer => ({
            ...transfer,
            from_name: userMap[transfer.from] || transfer.from,
            to_name: userMap[transfer.to] || transfer.to
          })) || []
        } : null
      };
    });

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
    const { type, environment, gsm_type, dealer, sicil_no, set_table_id } = req.params;

    if (typeof iccidText !== 'string') {
      return res.status(400).json({ error: 'iccidText should be a string' });
    }

    const iccidArray = iccidText.split(/\r?\n/)
      .map(iccid => iccid.trim())
      .filter(iccid => iccid !== '');

    const iccidsToInsert = iccidArray.map(iccid => ({
      iccid: iccid,
      stock: 'available',
      added_by: sicil_no,
      used_by: sicil_no,
      type: type,
      environment: environment,
      gsm_type: gsm_type,
      dealer: dealer,
      set_table_id: set_table_id || null, // Eğer set_id varsa ekle
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
    // 1) Tüm aktivasyon kayıtlarını ve toplam sayıyı çek
    const { data, count: totalActivations, error } = await supabase
      .from('activationstable')
      .select('user, created_at, activationtype, status, prod_ofr_id', { count: 'exact' });
    if (error) throw error;

    // 2) Benzersiz kullanıcı ID'lerini al
    const userIds = Array.from(new Set(data.map(r => r.user)));

    // 3) users tablosundan sicil_no -> full_name eşlemesi yap
    const { data: usersInfo, error: errUsers } = await supabase
      .from('users')
      .select('sicil_no, full_name')
      .in('sicil_no', userIds);
    if (errUsers) throw errUsers;
    const nameMap = Object.fromEntries(usersInfo.map(u => [u.sicil_no, u.full_name]));

    // 4) Gruplama objelerini hazırla
    const activationsByUser = {};
    const activationsByDay = {};
    const activationsByType = {};
    const activationsByStatus = {};
    const activationsByProduct = {};
    const activationsByUserDay = {};
    const activationsByProdType = {};

    // 5) Tek döngüyle tüm sayımları yap, user yerine full_name kullan
    data.forEach(record => {
      const {
        user: userId,
        created_at,
        activationtype,
        status,
        prod_ofr_id
      } = record;

      const fullName = nameMap[userId] || 'Bilinmeyen Kullanıcı';
      const day = new Date(created_at).toISOString().slice(0, 10);

      // byUser
      activationsByUser[fullName] = (activationsByUser[fullName] || 0) + 1;

      // byDay
      activationsByDay[day] = (activationsByDay[day] || 0) + 1;

      // byType
      activationsByType[activationtype] = (activationsByType[activationtype] || 0) + 1;

      // byStatus
      activationsByStatus[status] = (activationsByStatus[status] || 0) + 1;

      // byProduct
      activationsByProduct[prod_ofr_id] = (activationsByProduct[prod_ofr_id] || 0) + 1;

      // byUserDay
      if (!activationsByUserDay[day]) activationsByUserDay[day] = {};
      activationsByUserDay[day][fullName] =
        (activationsByUserDay[day][fullName] || 0) + 1;

      // byProdType: ürün × tip × {count, users}
      if (!activationsByProdType[prod_ofr_id]) activationsByProdType[prod_ofr_id] = {};
      const bucket = activationsByProdType[prod_ofr_id];

      if (!bucket[activationtype]) {
        bucket[activationtype] = { count: 0, users: new Set() };
      }
      bucket[activationtype].count++;
      bucket[activationtype].users.add(fullName);
    });

    // 6) Set’leri array’e çevir
    for (const prodId in activationsByProdType) {
      for (const type in activationsByProdType[prodId]) {
        activationsByProdType[prodId][type].users =
          Array.from(activationsByProdType[prodId][type].users);
      }
    }

    // 7) Yanıtı dön
    res.json({
      totalActivations,
      activations: {
        byUser: activationsByUser,
        byDay: activationsByDay,
        byType: activationsByType,
        byStatus: activationsByStatus,
        byProduct: activationsByProduct,
        byUserDay: activationsByUserDay,
        byProdType: activationsByProdType
      }
    });
  } catch (err) {
    console.error("Error in getStats:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const transferActivation = async (req, res) => {
  const { activationId, fromUser, toUser } = req.body;

  if (!activationId || !fromUser || !toUser) {
    return res.status(400).json({
      error: "Aktivasyon ID, gönderen kullanıcı ve alıcı kullanıcı zorunludur"
    });
  }

  if (fromUser === toUser) {
    return res.status(400).json({
      error: "Aynı kullanıcıya transfer yapamazsınız"
    });
  }

  try {
    // Önce aktivasyonu bul
    const { data: activationData, error: findError } = await supabase
      .from('activationstable')
      .select('*')
      .eq('activationid', activationId)
      .single();

    if (findError || !activationData) {
      return res.status(404).json({
        error: "Aktivasyon bulunamadı"
      });
    }

    // Transfer yetkisini kontrol et
    const currentOwner = activationData.transfer_user?.current_user || activationData.user;
    if (currentOwner !== fromUser) {
      return res.status(403).json({
        error: "Bu aktivasyonu transfer etme yetkiniz yok"
      });
    }

    // Alıcı kullanıcının varlığını kontrol et
    const { data: toUserData, error: userError } = await supabase
      .from('users')
      .select('sicil_no, full_name')
      .eq('sicil_no', toUser)
      .single();

    if (userError || !toUserData) {
      return res.status(404).json({
        error: "Alıcı kullanıcı bulunamadı"
      });
    }

    // Transfer geçmişini hazırla
    const currentTransfers = activationData.transfer_user?.transfers || [];

    // Önceki transferi pasif yap
    const updatedTransfers = currentTransfers.map(transfer => ({
      ...transfer,
      active: false
    }));

    // Yeni transfer ekle
    const newTransfer = {
      from: fromUser,
      to: toUser,
      date: new Date().toISOString(),
      active: true
    };

    updatedTransfers.push(newTransfer);

    const transferData = {
      transfers: updatedTransfers,
      original_user: activationData.transfer_user?.original_user || activationData.user,
      current_user: toUser
    };

    // Database'i güncelle
    const { data, error: updateError } = await supabase
      .from('activationstable')
      .update({
        transfer_user: transferData,
        updated_at: new Date().toISOString()
      })
      .eq('activationid', activationId)
      .select();

    if (updateError) throw updateError;

    // Gönderen kullanıcının bilgilerini al
    const { data: fromUserData, error: fromUserError } = await supabase
      .from('users')
      .select('sicil_no, full_name')
      .eq('sicil_no', fromUser)
      .single();

    if (!fromUserError && fromUserData) {
      // Alıcı kullanıcıya bildirim gönder
      const notificationMessage = `${fromUserData.full_name} size bir data transfer etti. MSISDN: ${activationData.msisdn}`;

      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_sicil_no: toUser,
          message: notificationMessage,
          cdate: new Date().toISOString(),
          statu: 'UNREAD'
        });

      if (notificationError) {
        console.error('Bildirim gönderilirken hata:', notificationError);
        // Bildirim hatası transfer işlemini etkilemesin
      }
    }

    res.json({
      message: `Aktivasyon ${toUserData.full_name} kullanıcısına başarıyla transfer edildi`,
      data: data[0]
    });

  } catch (err) {
    console.error("Transfer hatası:", err);
    res.status(500).json({ error: "Transfer işlemi sırasında bir hata oluştu" });
  }
};

const getTransferHistory = async (req, res) => {
  const { activationId } = req.params;

  if (!activationId) {
    return res.status(400).json({
      error: "Aktivasyon ID zorunludur"
    });
  }

  try {
    const { data: activationData, error } = await supabase
      .from('activationstable')
      .select('transfer_user, user, msisdn')
      .eq('activationid', activationId)
      .single();

    if (error || !activationData) {
      return res.status(404).json({
        error: "Aktivasyon bulunamadı"
      });
    }

    if (!activationData.transfer_user || !activationData.transfer_user.transfers) {
      return res.json({
        message: "Bu aktivasyon hiç transfer edilmemiş",
        original_user: activationData.user,
        current_user: activationData.user,
        transfers: []
      });
    }

    // Kullanıcı isimlerini al
    const allUsers = [...new Set([
      activationData.transfer_user.original_user,
      activationData.transfer_user.current_user,
      ...activationData.transfer_user.transfers.map(t => [t.from, t.to]).flat()
    ])];

    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('sicil_no, full_name')
      .in('sicil_no', allUsers);

    if (usersError) throw usersError;

    const userMap = usersData.reduce((acc, user) => {
      acc[user.sicil_no] = user.full_name;
      return acc;
    }, {});

    // Transfer geçmişini formatla
    const formattedTransfers = activationData.transfer_user.transfers.map(transfer => ({
      ...transfer,
      from_name: userMap[transfer.from] || 'Bilinmeyen Kullanıcı',
      to_name: userMap[transfer.to] || 'Bilinmeyen Kullanıcı'
    }));

    res.json({
      msisdn: activationData.msisdn,
      original_user: activationData.transfer_user.original_user,
      original_user_name: userMap[activationData.transfer_user.original_user] || 'Bilinmeyen Kullanıcı',
      current_user: activationData.transfer_user.current_user,
      current_user_name: userMap[activationData.transfer_user.current_user] || 'Bilinmeyen Kullanıcı',
      transfers: formattedTransfers
    });

  } catch (err) {
    console.error("Transfer geçmişi hatası:", err);
    res.status(500).json({ error: "Transfer geçmişi alınırken bir hata oluştu" });
  }
};

const getParams = async (req, res) => {
  const { type, env } = req.params;
  try {
    let query = supabase
      .from('gnl_parm')
      .select('*')
      .eq('gnl_parm_type_id', type);

    // env parametresi varsa filtreleme ekle
    if (env) {
      query = query.or(`extra_field1.eq.${env},extra_field1.eq.all`);
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json(data);
  } catch (err) {
    console.error("Error in getParams:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
}

const addParams = async (req, res) => {
  const { type, name } = req.body;

  try {
    const { data, error } = await supabase
      .from('gnl_parm')
      .insert({ gnl_parm_type_id: type, name: name, value: name });

    if (error) throw error;

    res.json(data);
  } catch (err) {
    console.error("Error in addParams:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
}

const deleteParams = async (req, res) => {
  const { type, userId, value } = req.body;

  try {
    const { data, error } = await supabase
      .from('gnl_parm')
      .delete()
      .eq('gnl_parm_type_id', type)
      .eq('value', value)

    if (data.user_sicil_no !== userId) {
      return res.status(403).json({
        error: "Silme işlemini sadece kendi eklediklerinizde yapabilirsiniz"
      });
    }

    if (error) throw error;

    res.json(data);
  } catch (err) {
    console.error("Error in deleteParams:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
}

const addSet = async (req, res) => {
  const { set_name, user_id } = req.body;

  try {
    const { data, error } = await supabase
      .from('set_table')
      .insert({ set_name: set_name, set_owner_id: user_id });


    if (error) throw error;

    res.json(data);
  } catch (err) {
    console.error("Error in addSet:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
const deleteSet = async (req, res) => {
  const { set_id } = req.body;

  try {
    // Önce iccidTable'daki ilişkili kayıtları sil
    const { error: iccidError } = await supabase
      .from('iccidTable')
      .delete()
      .eq('set_table_id', set_id);

    if (iccidError) throw iccidError;

    // Sonra set_table'daki ana kaydı sil
    const { data, error: setError } = await supabase
      .from('set_table')
      .delete()
      .eq('id', set_id)
      .select(); // Silinen kaydı geri döndürmek istersen .select() ekleyebilirsin

    if (setError) throw setError;

    // Tek response gönder
    res.json({ success: true, deletedSet: data });
  } catch (err) {
    console.error("Error in deleteSet:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};



const updateSet = async (req, res) => {
  const { set_id, set_name } = req.body;

  try {
    const { data, error } = await supabase
      .from('set_table')
      .update({ set_name: set_name })
      .eq('set_table_id', set_id);

    if (error) throw error;

    res.json(data);
  } catch (err) {
    console.error("Error in updateSet:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
}

const getSets = async (req, res) => {
  const { user_id } = req.params;
  try {
    const { data, error } = await supabase
      .from('set_table')
      .select('*')
      .eq('set_owner_id', user_id)
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error("Error in getSets:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
}

const updateSetName = async (req, res) => {
  const { set_id, set_name } = req.body;

  try {
    const { data, error } = await supabase
      .from('set_table')
      .update({ set_name: set_name })
      .eq('id', set_id);

    if (error) throw error;

    res.json(data);
  } catch (err) {
    console.error("Error in updateSetName:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
}

const addIccidToSet = async (req, res) => {
  const { set_id, iccid } = req.body;

  try {
    // Önce ICCID'nin mevcut olup olmadığını kontrol et
    const { data: iccidData, error: iccidError } = await supabase
      .from('iccidTable')
      .select('iccidid')
      .eq('iccid', iccid)
      .single();

    if (iccidError || !iccidData) {
      return res.status(404).json({ error: "ICCID bulunamadı" });
    }

    // ICCID'yi sete ekle
    const { data, error } = await supabase
      .from('iccidTable')
      .update({ set_table_id: set_id })
      .eq('iccidid', iccidData.iccidid);

    if (error) throw error;

    res.json(data);
  } catch (err) {
    console.error("Error in addIccidToSet:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
}

const removeIccidFromSet = async (req, res) => {
  const { set_id, iccid_id } = req.body;

  try {
    const { data, error } = await supabase
      .from('iccidTable')
      .update({ set_table_id: null })
      .eq('iccidid', iccid_id)
      .eq('set_table_id', set_id);

    if (error) throw error;

    res.json(data);
  } catch (err) {
    console.error("Error in removeIccidFromSet:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
}


module.exports = {
  getIccid,
  getIccidBySet,
  updateSetIccid,
  getIccidNew,
  iccidCountByDealer,
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
  getAll,
  getIccidByAddedByUserId,
  transferActivation,
  getTransferHistory,
  getParams,
  addParams,
  deleteParams,
  addSet,
  deleteSet,
  updateSet,
  getSets,
  updateSetName,
  addIccidToSet,
  removeIccidFromSet
};