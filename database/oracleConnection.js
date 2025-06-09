// oracleConnection.js
const oracledb = require('oracledb');
const oracleConfigs = require('../config/oracleConfig');

// Oracle connection pools
const pools = {};

// Initialize connection pools
const initializePools = async () => {
  try {
    for (const [key, config] of Object.entries(oracleConfigs)) {
      if (!pools[key]) {
        console.log(`${key} Oracle bağlantı havuzu başlatılıyor...`);
        pools[key] = await oracledb.createPool(config);
        console.log(`${key} Oracle bağlantı havuzu başarıyla oluşturuldu`);
      }
    }
  } catch (error) {
    console.error('Oracle bağlantı havuzu oluşturulurken hata:', error);
    throw error;
  }
};

// Get connection from specific pool
const getConnection = async (dbName = 'OMNI') => {
  try {
    if (!pools[dbName]) {
      throw new Error(`${dbName} bağlantı havuzu bulunamadı`);
    }
    
    const connection = await pools[dbName].getConnection();
    return connection;
  } catch (error) {
    console.error(`${dbName} bağlantısı alınırken hata:`, error);
    throw error;
  }
};

// Execute query with connection management
const executeQuery = async (query, params = [], dbName = 'OMNI') => {
  let connection;
  try {
    connection = await getConnection(dbName);
    const result = await connection.execute(query, params, {
      outFormat: oracledb.OUT_FORMAT_OBJECT
    });
    return result;
  } catch (error) {
    console.error('Sorgu çalıştırılırken hata:', error);
    throw error;
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (error) {
        console.error('Bağlantı kapatılırken hata:', error);
      }
    }
  }
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
  } catch (error) {
    console.error('Bağlantı havuzları kapatılırken hata:', error);
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
  pools
}; 