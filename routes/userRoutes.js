const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController.js");
const multer = require("multer");
// Bellekte tutacak, maksimum 5 MB dosya kabul edecek şekilde ayarlayabilirsiniz
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }
}); 
// Mernis Data Retrieval Routes

// Cleanup and Maintenance Routes
router.post("/updatePassword", userController.updatePassword);
router.post("/getUser", userController.getUser);
router.post("/createNotification", upload.single("file"), userController.createNotification);
router.get("/getUserNotifications/:sicil_no", userController.getUserNotifications);
router.put("/updateNotificationStatus/:id/:user_sicil_no", userController.updateNotificationStatus);
router.get("/getAllUsers", userController.getAllUsers);

module.exports = router;