const express = require("express");
const router = express.Router();
const mernisController = require("../controllers/mernisController.js");

router.post("/getMernis/:type", mernisController.getMernis);
router.post("/deleteSold", mernisController.deleteSold);
router.post("/getAll", mernisController.getAll);
router.post("/getAll/:type/:stock", mernisController.getAllSpesific);
router.post("/addMernis", mernisController.addMernis);
router.post("/mernisData/:type", mernisController.mernisData); 
router.post("/resetMernis", mernisController.resetMernis);
router.post("/useSql", mernisController.useSql);
module.exports = router;
