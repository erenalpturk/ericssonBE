const express = require("express");
const router = express.Router();
const scriptsController = require("../controllers/scriptsController.js");

// Scripts CRUD Routes

// GET - Tüm scriptleri getir (filtreleme ve sayfalama ile)
// Query params: category, project_name, user_name, page, limit
router.get("/", scriptsController.getAllScripts);

// GET - Proje listesini getir
router.get("/projects", scriptsController.getProjects);

// GET - Kullanıcının scriptlerini getir
// URL params: user_sicil_no
// Query params: page, limit
router.get("/user/:user_sicil_no", scriptsController.getUserScripts);

// GET - Script arama
// Query params: q (arama terimi), category, project_name, page, limit
router.get("/search", scriptsController.searchScripts);

// POST - Yeni script oluştur
// Body: { user_sicil_no, user_name, script_name, description, category, project_name? }
router.post("/", scriptsController.createScript);

// PUT - Script güncelle
// URL params: id
// Body: { user_sicil_no, script_name?, description?, category?, project_name? }
router.put("/:id", scriptsController.updateScript);

// DELETE - Script sil (soft delete)
// URL params: id
// Body: { user_sicil_no }
router.delete("/:id", scriptsController.deleteScript);

module.exports = router; 