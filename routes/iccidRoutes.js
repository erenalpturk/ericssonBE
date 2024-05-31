const express = require("express");
const router = express.Router();
const iccidController = require("../controllers/iccidController.js");

router.get("/getIccid", iccidController.getIccid);
router.get("/setSold", iccidController.setSold);
router.get("/setAvailable", iccidController.setAvailable);
router.get("/addIccid", iccidController.addIccid);

module.exports = router;
