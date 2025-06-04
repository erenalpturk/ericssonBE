const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController.js");

// Mernis Data Retrieval Routes

// Cleanup and Maintenance Routes
router.post("/updatePassword", userController.updatePassword);
router.post("/getUser", userController.getUser);

module.exports = router;