const express = require("express");
const router = express.Router();
const iccidController = require("../controllers/iccidController.js");

// ICCID Management Routes
router.post("/getIccid/:type/:sicil_no", iccidController.getIccid);
router.post("/setSold", iccidController.setSold);
router.post("/setAvailable", iccidController.setAvailable);
router.post("/update-iccid", iccidController.updateIccid);

// Bulk Operations
router.post("/deleteAll", iccidController.deleteAll);
router.post("/resetIccid", iccidController.resetIccid);
router.delete("/bulk-delete", iccidController.bulkDelete);

// Data Retrieval Routes
router.post("/getAll/:used_by", iccidController.getIccidByUserId);
router.post("/getAll", iccidController.getAll);
router.get("/getStats", iccidController.getStats);

// Activation Management Routes
router.post("/enesVeAlpDataniziCikti", iccidController.addActivation);
router.post("/enesvealpdatalarinizigetiriyoru", iccidController.getActivationsPublic);
router.post("/enesvealpdatalarinizigetiriyor/:user", iccidController.getActivations);
router.post("/update-activation", iccidController.updateActivation);

// ICCID Format and Import Routes
router.post("/formatAndInsertIccids/:type/:sicil_no", iccidController.formatAndInsertIccids);

module.exports = router;