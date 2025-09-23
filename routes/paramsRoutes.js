const express = require("express");
const router = express.Router();
const paramsController = require("../controllers/paramsController.js");

// Params Management Routes
router.get("/getAll", paramsController.getAllParams);
router.get("/getTypes", paramsController.getParameterTypes);
router.get("/get/:id", paramsController.getParameterById);
router.post("/create", paramsController.createParameter);
router.put("/update/:id", paramsController.updateParameter);
router.delete("/delete/:id", paramsController.deleteParameter);

module.exports = router;
