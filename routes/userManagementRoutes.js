const express = require("express");
const router = express.Router();
const userManagementController = require("../controllers/userManagementController.js");

// User Management Routes
router.get("/getAll", userManagementController.getAllUsers);
router.get("/get/:id", userManagementController.getUserById);
router.get("/stats", userManagementController.getUserStats);
router.post("/create", userManagementController.createUser);
router.put("/update/:id", userManagementController.updateUser);
router.delete("/delete/:id", userManagementController.deleteUser);
router.post("/reset-password/:id", userManagementController.resetUserPassword);

module.exports = router;
