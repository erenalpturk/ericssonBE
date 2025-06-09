// oracleConnection.js
const oracledb = require('oracledb');
const oracleConfigs = require('../config/oracleConfig');

// Oracle connection pools
const pools = {};
let initializationAttempted = false;

// Initialize connection pools with retry logic
const initializePools = async (retryCount = 3) => {
  if (initializationAttempted && Object.keys(pools).length > 0) {
    console.log('Oracle pools already initialized');
    return;
  }

  try {
    console.log('Oracle bağlantı havuzları başlatılıyor...');
    
    for (const [key, config] of Object.entries(oracleConfigs)) {
      if (!pools[key]) {
        console.log(`${key} Oracle bağlantı havuzu oluşturuluyor...`);
        
        try {
          pools[key] = await oracledb.createPool(config);
          console.log(`✅ ${key} Oracle bağlantı havuzu başarıyla oluşturuldu`);
        } catch (poolError) {
          console.error(`❌ ${key} bağlantı havuzu oluşturulamadı:`, poolError.message);
          // Kritik olmayan veritabanları için devam et
          if (key !== 'OMNI4' && key !== 'OMNI2') {
            continue;
          } else {
            throw poolError;
          }
        }
      }
    }
    
    initializationAttempted = true;
    console.log('✅ Oracle bağlantı havuzları başarıyla başlatıldı!');
    
  } catch (error) {
    console.error('❌ Oracle bağlantı havuzu oluşturulurken hata:', error.message);
    
    if (retryCount > 0) {
      console.log(`🔄 ${retryCount} deneme kaldı, 2 saniye sonra tekrar denenecek...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      return initializePools(retryCount - 1);
    }
    
    throw error;
  }
};

// Get connection from specific pool with initialization check
const getConnection = async (dbName = 'OMNI') => {
  try {
    // Eğer pools henüz başlatılmamışsa, başlat
    if (!initializationAttempted || !pools[dbName]) {
      console.log(`${dbName} havuzu bulunamadı, havuzlar başlatılıyor...`);
      await initializePools();
    }
    
    if (!pools[dbName]) {
      throw new Error(`${dbName} bağlantı havuzu bulunamadı`);
    }
    
    const connection = await pools[dbName].getConnection();
    return connection;
  } catch (error) {
    console.error(`${dbName} bağlantısı alınırken hata:`, error.message);
    throw error;
  }
};

// Execute query with connection management and timeout
const executeQuery = async (query, params = [], dbName = 'OMNI', timeoutMs = 30000) => {
  let connection;
  try {
    // Timeout wrapper for the entire query operation
    const queryPromise = (async () => {
      connection = await getConnection(dbName);
      const result = await connection.execute(query, params, {
        outFormat: oracledb.OUT_FORMAT_OBJECT
      });
      return result;
    })();

    // Create timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Query timeout after ${timeoutMs}ms for database ${dbName}`));
      }, timeoutMs);
    });

    // Race between query and timeout
    const result = await Promise.race([queryPromise, timeoutPromise]);
    return result;
    
  } catch (error) {
    console.error(`Sorgu çalıştırılırken hata (${dbName}):`, error.message);
    throw error;
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (error) {
        console.error('Bağlantı kapatılırken hata:', error.message);
      }
    }
  }
};

// Check if pools are initialized
const arePoolsInitialized = () => {
  return initializationAttempted && Object.keys(pools).length > 0;
};

// Get pool status
const getPoolStatus = () => {
  const status = {};
  for (const [key, pool] of Object.entries(pools)) {
    if (pool) {
      status[key] = {
        isOpen: !pool.isTerminating,
        connectionsInUse: pool.connectionsInUse,
        connectionsOpen: pool.connectionsOpen,
        poolMin: pool.poolMin,
        poolMax: pool.poolMax
      };
    } else {
      status[key] = { status: 'not_initialized' };
    }
  }
  return status;
};

// Close all pools
const closeAllPools = async () => {
  try {
    for (const [key, pool] of Object.entries(pools)) {
      if (pool) {
        console.log(`${key} bağlantı havuzu kapatılıyor...`);
        await pool.close(0);
        delete pools[key];
        console.log(`${key} bağlantı havuzu kapatıldı`);
      }
    }
    initializationAttempted = false;
  } catch (error) {
    console.error('Bağlantı havuzları kapatılırken hata:', error.message);
    throw error;
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Uygulama kapatılıyor, Oracle bağlantıları temizleniyor...');
  await closeAllPools();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Uygulama sonlandırılıyor, Oracle bağlantıları temizleniyor...');
  await closeAllPools();
  process.exit(0);
});

module.exports = {
  initializePools,
  getConnection,
  executeQuery,
  closeAllPools,
  arePoolsInitialized,
  getPoolStatus,
  pools
}; 