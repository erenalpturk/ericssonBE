const express = require('express');
const router = express.Router();
const {
    getAllTriggers,
    createTrigger,
    updateTrigger,
    deleteTrigger,
    updateTriggerOrder,
    getActiveTriggers,
    proxyRequest
} = require('../controllers/courierTriggersController');

// Admin middleware - sadece adminler erişebilir
const adminOnly = (req, res, next) => {
    try {
        // User bilgisini header'dan al
        const userHeader = req.headers['x-user-data'];
        if (!userHeader) {
            return res.status(401).json({
                success: false,
                message: 'Kullanıcı bilgisi bulunamadı'
            });
        }

        const user = JSON.parse(userHeader);

        // Admin kontrolü
        if (!user || user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Bu işlem için admin yetkisi gereklidir'
            });
        }

        // User bilgisini req'e ekle
        req.user = user;
        next();
    } catch (error) {
        console.error('Admin middleware error:', error);
        res.status(401).json({
            success: false,
            message: 'Geçersiz kullanıcı bilgisi'
        });
    }
};

// Public routes (sadece tetikleme için)
router.get('/active/:environment/:sim_type', getActiveTriggers);
router.post('/proxy', proxyRequest); // CORS bypass proxy

// Admin only routes
router.get('/', adminOnly, getAllTriggers);
router.post('/', adminOnly, createTrigger);
router.put('/:id', adminOnly, updateTrigger);
router.delete('/:id', adminOnly, deleteTrigger);
router.put('/order/update', adminOnly, updateTriggerOrder);

module.exports = router; 