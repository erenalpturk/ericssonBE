// oracleRoutes.js
const express = require('express');
const router = express.Router();
const {
  testQuery,
  executeCustomQuery,
  checkConnection,
  checkAllConnections,
  getActivationStatus,
  getBulkActivationStatus,
  getLatestEncryptedSms,
  getPoolStatus,
  quickHealthCheck
} = require('../controllers/oracleController');

// Test sorgusu - örnek MSISDN sorgusu
router.get('/test/:msisdn/:dbName?', testQuery);

// Genel sorgu çalıştırma
router.post('/query', executeCustomQuery);

// Belirli veritabanı bağlantı testi
router.get('/health/:dbName?', checkConnection);

// Tüm veritabanları bağlantı testi
router.get('/health-all', checkAllConnections);

// Aktiflik/Pasiflik durumu sorgulama (tekli)
router.get('/activation-status/:msisdn/:dbName?', getActivationStatus);

// Aktiflik/Pasiflik durumu sorgulama (bulk)
router.post('/activation-status-bulk', getBulkActivationStatus);

// Son 5 şifrelenmiş SMS getirme
router.get('/encrypted-sms/:dbName?', getLatestEncryptedSms);

// Pool durumu kontrol
router.get('/pool-status', getPoolStatus);

// Quick health check
router.get('/health-quick', quickHealthCheck);

module.exports = router; 