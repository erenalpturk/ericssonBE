const express = require("express");
const router = express.Router();
const mernisController = require("../controllers/mernisController.js");

// Mernis Data Retrieval Routes
router.post("/getMernis/:type", mernisController.getMernis);
router.post("/getAll", mernisController.getAll);
router.post("/getAll/:type/:stock", mernisController.getAllSpesific);

// Mernis Data Management Routes
router.post("/addMernis", mernisController.addMernis);
router.post("/mernisData/:type", mernisController.mernisData);

// Cleanup and Maintenance Routes
router.post("/deleteSold", mernisController.deleteSold);
router.post("/resetMernis", mernisController.resetMernis);

module.exports = router;