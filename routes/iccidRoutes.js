const express = require("express");
const router = express.Router();
const iccidController = require("../controllers/iccidController.js");

router.get("/getIccid", iccidController.getIccid);
router.post("/setSold", iccidController.setSold);
router.post("/setAvailable", iccidController.setAvailable);
router.post("/addIccid", iccidController.addIccid);

module.exports = router;
