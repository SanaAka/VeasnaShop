const express = require("express");
const orderController = require("../controllers/orderController");
const authMiddleware = require("../middlewares/authMiddleware");

const router = express.Router();

router.get("/", authMiddleware, orderController.listOrders);
router.get("/:id", authMiddleware, orderController.getOrder);

module.exports = router;
