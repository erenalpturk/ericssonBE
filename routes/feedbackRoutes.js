const express = require('express');
const router = express.Router();
const {
    getUserFeedbacks,
    createFeedback,
    addFeedbackResponse,
    getAllFeedbacks,
    updateFeedbackStatus,
    getDashboardStats,
    getUserStats,
    getFeedbackById
} = require('../controllers/feedbackController');

// Kullanıcı feedback route'ları
router.post('/user/feedbacks', getUserFeedbacks);
router.post('/user/stats', getUserStats);
router.post('/create', createFeedback);
router.post('/response', addFeedbackResponse);
router.get('/detail/:id', getFeedbackById);

// Admin feedback route'ları
router.get('/admin/all', getAllFeedbacks);
router.put('/admin/update/:id', updateFeedbackStatus);
router.put('/admin/:id/status', updateFeedbackStatus);
router.put('/admin/:id/priority', updateFeedbackStatus);
router.get('/admin/dashboard', getDashboardStats);

module.exports = router; 