// const express = require("express");
// const router = express.Router();
// const iccidController = require("../controllers/iccidController.js");

// router.post("/getIccid/:type", iccidController.getIccid);
// router.post("/setSold", iccidController.setSold);
// router.post("/setAvailable", iccidController.setAvailable);
// router.post("/addIccid/:type", iccidController.addIccid);
// router.post("/getAll/:type/:stock", iccidController.getAllSpesific);
// router.post("/getAll", iccidController.getAll);
// router.post("/deleteAll", iccidController.deleteAll);
// router.post("/resetIccid", iccidController.resetIccid);
// router.get("/getStats", iccidController.getStats);
// router.post("/enesVeAlpDataniziCikti", iccidController.addActivation);
// router.post("/enesvealpdatalarinizigetiriyor", iccidController.getActivationsPublic);
// router.post("/enesvealpdatalarinizigetiriyor/:user", iccidController.getActivations);
// router.post("/formatIccid", iccidController.formatIccid);
// router.post("/formatAndInsertIccids/:type", iccidController.formatAndInsertIccids);
// router.post("/reservedToAvailable", iccidController.reservedToAvailable);
// module.exports = router;


const express = require("express");
const router = express.Router();
const iccidController = require("../controllers/iccidController.js");

// ICCID Management Routes
router.post("/getIccid/:type", iccidController.getIccid);
router.post("/setSold", iccidController.setSold);
router.post("/setAvailable", iccidController.setAvailable);
router.post("/reservedToAvailable", iccidController.reservedToAvailable);

// Bulk Operations
router.post("/addIccid/:type", iccidController.addIccid);
router.post("/deleteAll", iccidController.deleteAll);
router.post("/resetIccid", iccidController.resetIccid);

// Data Retrieval Routes
router.post("/getAll/:type/:stock", iccidController.getAllSpesific);
router.post("/getAll", iccidController.getAll);
router.get("/getStats", iccidController.getStats);

// Activation Management Routes
router.post("/enesVeAlpDataniziCikti", iccidController.addActivation);
router.post("/enesvealpdatalarinizigetiriyor", iccidController.getActivationsPublic);
router.post("/enesvealpdatalarinizigetiriyor/:user", iccidController.getActivations);

// ICCID Format and Import Routes
router.post("/formatIccid", iccidController.formatIccid);
router.post("/formatAndInsertIccids/:type", iccidController.formatAndInsertIccids);

module.exports = router;