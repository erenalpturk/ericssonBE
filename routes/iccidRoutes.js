const express = require("express");
const router = express.Router();
const iccidController = require("../controllers/iccidController.js");

router.post("/getIccid/:type", iccidController.getIccid);
router.post("/setSold", iccidController.setSold);
router.post("/setAvailable", iccidController.setAvailable);
router.post("/addIccid", iccidController.addIccid);
router.post("/getAll/:type/:stock", iccidController.getAllSpesific);
router.post("/getAll", iccidController.getAll);
router.post("/deleteAll", iccidController.deleteAll);
router.post("/resetIccid", iccidController.resetIccid);
router.post("/enesVeAlpDataniziCikti", iccidController.addActivation);
router.post("/enesvealpdatalarinizigetiriyor", iccidController.getActivationsPublic);
router.post("/enesvealpdatalarinizigetiriyor/:user", iccidController.getActivations);

module.exports = router;
