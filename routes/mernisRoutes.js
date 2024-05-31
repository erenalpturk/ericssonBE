const express = require("express");
const router = express.Router();
const mernisController = require("../controllers/mernisController.js");

router.post("/getMernis/:type", mernisController.getMernis);
router.post("/deleteSold", mernisController.deleteSold);
router.post("/getAll", mernisController.getAll);
router.post("/addMernis", mernisController.addMernis);

module.exports = router;