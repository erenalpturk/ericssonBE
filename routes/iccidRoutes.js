const express = require("express");
const router = express.Router();
const iccidController = require("../controllers/iccidController.js");

router.post("/getIccid", iccidController.getIccid);
router.post("/setSold", iccidController.setSold);
router.post("/setAvailable", iccidController.setAvailable);
router.post("/addIccid", iccidController.addIccid);
router.post("/getAll", iccidController.getAll);

module.exports = router;
