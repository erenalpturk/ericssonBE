const express = require("express");
const router = express.Router();
const iccidController = require("../controllers/iccidController.js");

// ICCID Management Routes
router.post("/getIccid/:type/:sicil_no/:count", iccidController.getIccid);
router.post("/getIccidBySet/:set_id", iccidController.getIccidBySet);
router.post("/newgetIccid/:environment/:gsm_type/:dealer/:sicil_no/:count", iccidController.getIccidNew);
router.post("/update-iccid", iccidController.updateIccid);
router.post("/updateSetIccid/:set_table_id", iccidController.updateSetIccid);
router.get("/iccidCountByDealer", iccidController.iccidCountByDealer);

router.post("/addSet", iccidController.addSet);
router.post("/deleteSet", iccidController.deleteSet);
router.post("/updateSet", iccidController.updateSet);
router.post("/updateSetName", iccidController.updateSetName);
router.post("/addIccidToSet", iccidController.addIccidToSet);
router.post("/removeIccidFromSet", iccidController.removeIccidFromSet);
router.get("/getSets/:user_id", iccidController.getSets);
router.get("/getIccidBySet/:set_id", iccidController.getIccidBySet);

// Params Management Routes
router.get("/getParams/:type/:env?", iccidController.getParams);
router.post("/addParams", iccidController.addParams);
router.post("/deleteParams", iccidController.deleteParams);

// Bulk Operations
router.post("/deleteAll", iccidController.deleteAll);
router.post("/resetIccid", iccidController.resetIccid);
router.delete("/bulk-delete", iccidController.bulkDelete);

// Data Retrieval Routes
router.get("/getAll/:added_by", iccidController.getIccidByAddedByUserId);
router.post("/getAll/:used_by", iccidController.getIccidByUserId);
router.post("/getAll", iccidController.getAll);
router.get("/getStats", iccidController.getStats);

// Activation Management Routes
router.post("/enesVeAlpDataniziCikti", iccidController.addActivation);
router.post("/enesvealpdatalarinizigetiriyoru", iccidController.getActivationsPublic);
router.post("/enesvealpdatalarinizigetiriyor/:user", iccidController.getActivations);
router.post("/update-activation", iccidController.updateActivation);

// Transfer Routes
router.post("/transfer-activation", iccidController.transferActivation);
router.get("/transfer-history/:activationId", iccidController.getTransferHistory);

// ICCID Format and Import Routes
router.post("/formatAndInsertIccids/:type/:environment/:gsm_type/:dealer/:sicil_no/:set_table_id", iccidController.formatAndInsertIccids);

module.exports = router;


