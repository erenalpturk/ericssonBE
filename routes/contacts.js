const express = require('express');
const router = express.Router();
const contactsController = require('../controllers/contactsController');

// GET /api/contacts - Tüm kontakları getir
router.get('/', contactsController.getAllContacts);

// POST /api/contacts - Yeni kontak oluştur
router.post('/', contactsController.createContact);

// PUT /api/contacts/:id - Kontak güncelle
router.put('/:id', contactsController.updateContact);

// DELETE /api/contacts/:id - Kontak sil
router.delete('/:id', contactsController.deleteContact);

module.exports = router; 