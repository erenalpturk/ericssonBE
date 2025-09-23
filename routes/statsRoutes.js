const express = require("express");
const router = express.Router();
const statsController = require("../controllers/statsController.js");

// Statistics Routes
router.get("/system", statsController.getSystemStats);
router.get("/user/:userId", statsController.getUserStats);
router.get("/user-activations", statsController.getUserActivations);

module.exports = router;
