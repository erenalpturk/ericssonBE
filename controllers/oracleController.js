const { executeQuery } = require('../database/oracleConnection');

// Test endpoint - örnek sorgu
const testQuery = async (req, res) => {
  const { msisdn, dbName = 'OMNI4' } = req.params;
  
  if (!msisdn) {
    return res.status(400).json({ error: 'MSISDN parametresi gerekli' });
  }

  try {
    const query = `
      select val from omni_bss.CUST_ACCT_CHAR_VAL where cust_acct_id in 
      (select bill_acct_id from omni_bss.prod where ident_val1=:msisdn) and char_id='297799' 
      order by cdate desc FETCH FIRST 1 ROWS ONLY
    `;
    
    const result = await executeQuery(query, [msisdn], dbName);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        message: `${msisdn} numarası için veri bulunamadı`,
        database: dbName
      });
    }
    
    res.json({
      message: 'Sorgu başarıyla çalıştırıldı',
      database: dbName,
      msisdn: msisdn,
      data: result.rows[0]
    });
    
  } catch (error) {
    console.error('Oracle sorgu hatası:', error);
    res.status(500).json({ 
      error: 'Oracle sorgusu çalıştırılırken hata oluştu',
      details: error.message 
    });
  }
};

// Genel sorgu endpoint'i
const executeCustomQuery = async (req, res) => {
  const { query, params = [], dbName = 'OMNI4' } = req.body;
  
  if (!query) {
    return res.status(400).json({ error: 'SQL sorgusu gerekli' });
  }

  try {
    const result = await executeQuery(query, params, dbName);
    
    res.json({
      message: 'Sorgu başarıyla çalıştırıldı',
      database: dbName,
      rowCount: result.rows.length,
      data: result.rows
    });
    
  } catch (error) {
    console.error('Oracle sorgu hatası:', error);
    res.status(500).json({ 
      error: 'Oracle sorgusu çalıştırılırken hata oluştu',
      details: error.message 
    });
  }
};

// Bağlantı durumu kontrol endpoint'i
const checkConnection = async (req, res) => {
  const { dbName = 'OMNI4' } = req.params;
  
  try {
    // Test 1: Basit sorgu
    const result = await executeQuery('SELECT SYSDATE FROM DUAL', [], dbName);
    
    // Test 2: Kullanıcı bilgisi
    const userResult = await executeQuery('SELECT USER FROM DUAL', [], dbName);
    
    // Test 3: Erişilebilen tablolar
    let tablesResult = null;
    try {
      tablesResult = await executeQuery(`
        SELECT owner, table_name 
        FROM all_tables 
        WHERE owner IN ('OMNI_BSS', 'OMNIBSS', USER) 
        AND table_name IN ('CUST_ACCT_CHAR_VAL', 'PROD')
        ORDER BY owner, table_name
      `, [], dbName);
    } catch (tableError) {
      console.log('Table check error:', tableError.message);
    }
    
    // Test 4: Direkt şema kontrolü
    let schemaResult = null;
    try {
      schemaResult = await executeQuery(`
        SELECT * FROM omni_bss.CUST_ACCT_CHAR_VAL 
        WHERE ROWNUM <= 1
      `, [], dbName);
    } catch (schemaError) {
      console.log('Schema access error:', schemaError.message);
    }
    
    res.json({
      message: `${dbName} veritabanı bağlantısı başarılı`,
      database: dbName,
      serverTime: result.rows[0].SYSDATE,
      currentUser: userResult.rows[0].USER,
      accessibleTables: tablesResult ? tablesResult.rows : 'Error checking tables',
      schemaTest: schemaResult ? 'Success' : 'Failed',
      status: 'connected'
    });
    
  } catch (error) {
    console.error('Oracle bağlantı testi hatası:', error);
    res.status(500).json({ 
      error: `${dbName} veritabanı bağlantısında hata`,
      details: error.message,
      errorCode: error.errorNum,
      status: 'disconnected'
    });
  }
};

// Tüm veritabanları bağlantı durumu
const checkAllConnections = async (req, res) => {
  const databases = ['OMNI', 'OMNI2', 'OMNI3', 'OMNI4', 'OMNI5'];
  const results = {};
  
  for (const dbName of databases) {
    try {
      const result = await executeQuery('SELECT SYSDATE FROM DUAL', [], dbName);
      results[dbName] = {
        status: 'connected',
        serverTime: result.rows[0].SYSDATE
      };
    } catch (error) {
      results[dbName] = {
        status: 'disconnected',
        error: error.message
      };
    }
  }
  
  res.json({
    message: 'Tüm veritabanları bağlantı durumu kontrol edildi',
    results: results
  });
};

// Aktiflik/Pasiflik durumu sorgulama endpoint'i
const getActivationStatus = async (req, res) => {
  const { msisdn, dbName = 'OMNI4' } = req.params;
  
  if (!msisdn) {
    return res.status(400).json({ error: 'MSISDN parametresi gerekli' });
  }

  try {
    // Connection pool'un hazır olduğunu kontrol et
    const { arePoolsInitialized } = require('../database/oracleConnection');
    
    if (!arePoolsInitialized()) {
      console.log('Pools not initialized, initializing now...');
      const { initializePools } = require('../database/oracleConnection');
      await initializePools();
    }
         // Oracle sorgusu çalıştır
    
    // Test 3: Ana sorgu farklı şekillerde deneyelim
    const queries = [
      // Orijinal sorgu
      `select val from omni_bss.CUST_ACCT_CHAR_VAL where cust_acct_id in 
       (select bill_acct_id from omni_bss.prod where ident_val1=:msisdn) and char_id='297799' 
       order by cdate desc FETCH FIRST 1 ROWS ONLY`,
      
      // Büyük harfle
      `SELECT VAL FROM OMNI_BSS.CUST_ACCT_CHAR_VAL WHERE CUST_ACCT_ID IN 
       (SELECT BILL_ACCT_ID FROM OMNI_BSS.PROD WHERE IDENT_VAL1=:msisdn) AND CHAR_ID='297799' 
       ORDER BY CDATE DESC FETCH FIRST 1 ROWS ONLY`,
       
      // Şema olmadan (eğer current user'ın şemasındaysa)
      `SELECT VAL FROM CUST_ACCT_CHAR_VAL WHERE CUST_ACCT_ID IN 
       (SELECT BILL_ACCT_ID FROM PROD WHERE IDENT_VAL1=:msisdn) AND CHAR_ID='297799' 
       ORDER BY CDATE DESC FETCH FIRST 1 ROWS ONLY`
    ];
    
    let result = null;
    let workingQuery = null;
    
         for (let i = 0; i < queries.length; i++) {
       try {
         result = await executeQuery(queries[i], [msisdn], dbName);
         workingQuery = i + 1;
         console.log(`Query ${i + 1} worked! Result:`, result.rows);
         break;
       } catch (queryError) {
         console.log(`Query ${i + 1} failed:`, queryError.message);
       }
     }
    
    if (!result || result.rows.length === 0) {
      return res.json({ 
        msisdn: msisdn,
        status: 'Veri Yok',
        statusType: 'no-data',
        message: `${msisdn} numarası için aktiflik verisi bulunamadı`,
        workingQuery: workingQuery,
        debug: 'All queries tested'
      });
    }
    
          const val = result.rows[0].VAL;
      console.log('Oracle VAL değeri:', val, 'Type:', typeof val);
      
      // Oracle'dan gelen değeri olduğu gibi göster
      let statusType;
      if (val === '1' || val === 1 || val?.toString().toLowerCase() === 'aktif') {
        statusType = 'active';
      } else if (val === '0' || val === 0 || val?.toString().toLowerCase() === 'pasif') {
        statusType = 'passive';
      } else {
        statusType = 'unknown';
      }
      
      res.json({
        msisdn: msisdn,
        status: val, // Oracle'dan ne dönerse onu göster
        statusType: statusType,
        val: val,
        database: dbName,
        workingQuery: workingQuery
      });
    
  } catch (error) {
    console.error('Oracle aktiflik sorgu hatası:', error);
    res.json({ 
      msisdn: msisdn,
      status: 'Hata',
      statusType: 'error',
      error: error.message,
      errorCode: error.errorNum
    });
  }
};

// Bulk aktiflik/pasiflik durumu sorgulama endpoint'i
const getBulkActivationStatus = async (req, res) => {
  const { msisdns, dbName = 'OMNI4' } = req.body;
  
  if (!msisdns || !Array.isArray(msisdns) || msisdns.length === 0) {
    return res.status(400).json({ error: 'MSISDN array gerekli' });
  }

  try {
    // Connection pool'un hazır olduğunu kontrol et
    const { arePoolsInitialized, getPoolStatus } = require('../database/oracleConnection');
    
    if (!arePoolsInitialized()) {
      console.log('Pools not initialized, initializing now...');
      const { initializePools } = require('../database/oracleConnection');
      await initializePools();
    }
    
    console.log('Pool Status:', getPoolStatus());
    // Oracle sorgusu ile birden fazla MSISDN'yi tek seferde sorgula
    const placeholders = msisdns.map((_, index) => `:msisdn${index}`).join(',');
    const query = `
      SELECT p.ident_val1 as msisdn, c.val 
      FROM omni_bss.CUST_ACCT_CHAR_VAL c
      INNER JOIN omni_bss.prod p ON c.cust_acct_id = p.bill_acct_id
      WHERE p.ident_val1 IN (${placeholders}) 
      AND c.char_id = '297799'
      AND c.cdate = (
        SELECT MAX(c2.cdate) 
        FROM omni_bss.CUST_ACCT_CHAR_VAL c2 
        INNER JOIN omni_bss.prod p2 ON c2.cust_acct_id = p2.bill_acct_id
        WHERE p2.ident_val1 = p.ident_val1 AND c2.char_id = '297799'
      )
    `;
    
    // Parameters array oluştur
    const params = msisdns.reduce((acc, msisdn, index) => {
      acc[`msisdn${index}`] = msisdn;
      return acc;
    }, {});
    
    console.log('Bulk query for MSISDNs:', msisdns.slice(0, 5), '...'); // İlk 5'ini log'la
    
    const result = await executeQuery(query, params, dbName);
    
    // Sonuçları map'le ve eksik olan MSISDN'ler için default değer ver
    const statusMap = {};
    
         // Sonuçları işle
     result.rows.forEach(row => {
       const msisdn = row.MSISDN;
       const val = row.VAL;
       
       // Val değerini olduğu gibi göster, ekstra tanımlama yapma
       let statusType;
       if (val === '1' || val === 1 || val?.toString().toLowerCase() === 'aktif') {
         statusType = 'active';
       } else if (val === '0' || val === 0 || val?.toString().toLowerCase() === 'pasif') {
         statusType = 'passive';
       } else {
         statusType = 'unknown';
       }
       
       statusMap[msisdn] = {
         msisdn: msisdn,
         status: val, // Oracle'dan ne dönerse onu göster
         statusType: statusType,
         val: val
       };
     });
    
    // Sorgu sonucunda bulunmayan MSISDN'ler için default değer
    msisdns.forEach(msisdn => {
      if (!statusMap[msisdn]) {
        statusMap[msisdn] = {
          msisdn: msisdn,
          status: 'Veri Yok',
          statusType: 'no-data',
          message: `${msisdn} numarası için aktiflik verisi bulunamadı`
        };
      }
    });
    
    res.json({
      message: `${msisdns.length} MSISDN için aktiflik durumu sorgulandı`,
      database: dbName,
      foundCount: result.rows.length,
      results: statusMap
    });
    
  } catch (error) {
    console.error('Oracle bulk aktiflik sorgu hatası:', error);
    res.status(500).json({ 
      error: 'Oracle bulk sorgusu çalıştırılırken hata oluştu',
      details: error.message,
      errorCode: error.errorNum
    });
  }
};

// Son 5 şifrelenmiş SMS'i getiren endpoint
const getLatestEncryptedSms = async (req, res) => {
  const { dbName = 'OMNI4' } = req.params;
  
  try {
    // Connection pool'un hazır olduğunu kontrol et
    const { arePoolsInitialized } = require('../database/oracleConnection');
    
    if (!arePoolsInitialized()) {
      console.log('Pools not initialized, initializing now...');
      const { initializePools } = require('../database/oracleConnection');
      await initializePools();
    }
    const query = `
      select tel_num, sms_val 
      from omni_bss.odf_sms_ntf 
      order by cdate desc 
      FETCH FIRST 5 ROWS ONLY
    `;
    
    console.log(`Getting latest encrypted SMS from ${dbName}`);
    
    const result = await executeQuery(query, [], dbName);
    
    res.json({
      message: `${dbName} veritabanından son 5 şifrelenmiş SMS alındı`,
      database: dbName,
      count: result.rows.length,
      data: result.rows.map(row => ({
        msisdn: row.TEL_NUM,
        encryptedValue: row.SMS_VAL
      }))
    });
    
  } catch (error) {
    console.error('Oracle şifrelenmiş SMS sorgu hatası:', error);
    res.status(500).json({ 
      error: 'Oracle şifrelenmiş SMS sorgusu çalıştırılırken hata oluştu',
      details: error.message,
      errorCode: error.errorNum
    });
  }
};

// Pool durumu kontrol endpoint'i
const getPoolStatus = async (req, res) => {
  try {
    const { arePoolsInitialized, getPoolStatus } = require('../database/oracleConnection');
    
    res.json({
      message: 'Oracle bağlantı havuzu durumu',
      initialized: arePoolsInitialized(),
      pools: getPoolStatus(),
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Pool status kontrolü hatası:', error);
    res.status(500).json({ 
      error: 'Pool status kontrol edilirken hata oluştu',
      details: error.message
    });
  }
};

module.exports = {
  testQuery,
  executeCustomQuery,
  checkConnection,
  checkAllConnections,
  getActivationStatus,
  getBulkActivationStatus,
  getLatestEncryptedSms,
  getPoolStatus
}; 