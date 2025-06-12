const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController.js");

// Mernis Data Retrieval Routes

// Cleanup and Maintenance Routes
router.post("/updatePassword", userController.updatePassword);
router.post("/getUser", userController.getUser);
router.post("/createNotification", userController.createNotification);
router.get("/getUserNotifications/:sicil_no", userController.getUserNotifications);
router.put("/updateNotificationStatus/:id/:user_sicil_no", userController.updateNotificationStatus);
router.get("/getAllUsers", userController.getAllUsers);

module.exports = router;