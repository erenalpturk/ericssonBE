const express = require("express");
const router = express.Router();
const iccidController = require("../controllers/iccidController.js");

router.post("/getIccid", iccidController.getIccid);
router.post("/setSold/:path", iccidController.setSold);
router.post("/setAvailable", iccidController.setAvailable);
router.post("/addIccid", iccidController.addIccid);
router.post("/getAll", iccidController.getAll);
router.post("/deleteAll", iccidController.deleteAll);

module.exports = router;
