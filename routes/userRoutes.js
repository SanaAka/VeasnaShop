const express = require("express");
const userController = require("../controllers/userController");
const orderController = require("../controllers/orderController");
const authMiddleware = require("../middlewares/authMiddleware");

const router = express.Router();

router.use(authMiddleware);

router.get("/dashboard", userController.dashboard);
router.get("/orders", orderController.listOrders);
router.get("/wishlist", userController.wishlist);
router.post("/wishlist", userController.addWishlist);
router.delete("/wishlist/:productId", userController.removeWishlist);
router.get("/addresses", userController.addresses);
router.post("/addresses", userController.upsertAddress);
router.delete("/addresses/:addressId", userController.deleteAddress);
router.get("/rituals", userController.ritual);
router.post("/rituals", userController.updateRitual);
router.patch("/settings", userController.updateSettings);

module.exports = router;
