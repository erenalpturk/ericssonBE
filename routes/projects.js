const express = require('express');
const router = express.Router();
const projectsController = require('../controllers/projectsController');

// GET /api/projects - Tüm projeleri getir
router.get('/', projectsController.getAllProjects);

// GET /api/projects/names - Aktif proje isimlerini getir (dropdown için)
router.get('/names', projectsController.getProjectNames);

// POST /api/projects - Yeni proje oluştur (sadece admin)
router.post('/', projectsController.createProject);

// PUT /api/projects/:id - Proje güncelle (sadece admin)
router.put('/:id', projectsController.updateProject);

// DELETE /api/projects/:id - Proje sil (sadece admin)
router.delete('/:id', projectsController.deleteProject);

module.exports = router; 