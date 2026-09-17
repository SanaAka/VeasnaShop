const express = require("express");
const stripeController = require("../controllers/stripeController");
const authMiddleware = require("../middlewares/authMiddleware");

const router = express.Router();

router.post("/payment-intent", authMiddleware, stripeController.createPaymentIntent);
router.post("/", authMiddleware, stripeController.createOrder);

module.exports = router;
