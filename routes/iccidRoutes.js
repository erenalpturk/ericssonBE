const express = require("express");
const router = express.Router();
const iccidController = require("../controllers/iccidController.js");

// ICCID Management Routes
router.post("/getIccid/:type/:sicil_no", iccidController.getIccid);
router.post("/setSold", iccidController.setSold);
router.post("/setAvailable", iccidController.setAvailable);
router.post("/reservedToAvailable", iccidController.reservedToAvailable);
router.post("/setStatus", iccidController.setStatus);

// Bulk Operations
router.post("/addIccid/:type", iccidController.addIccid);
router.post("/deleteAll", iccidController.deleteAll);
router.post("/resetIccid", iccidController.resetIccid);

// Data Retrieval Routes
router.post("/getAll/:type/:stock", iccidController.getAllSpesific);
router.post("/getAll/:used_by", iccidController.getIccidByUserId);
router.post("/getAll", iccidController.getAll);
router.get("/getStats", iccidController.getStats);

// Activation Management Routes
router.post("/enesVeAlpDataniziCikti", iccidController.addActivation);
router.post("/enesvealpdatalarinizigetiriyoru", iccidController.getActivationsPublic);
router.post("/enesvealpdatalarinizigetiriyor/:user", iccidController.getActivations);

// ICCID Format and Import Routes
router.post("/formatIccid", iccidController.formatIccid);
router.post("/formatAndInsertIccids/:type/:sicil_no", iccidController.formatAndInsertIccids);

// Bulk Delete Route
router.delete("/bulk-delete", iccidController.bulkDelete);

module.exports = router;