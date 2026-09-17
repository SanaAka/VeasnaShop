const express = require("express");
const adminController = require("../controllers/adminController");
const authMiddleware = require("../middlewares/authMiddleware");
const adminMiddleware = require("../middlewares/adminMiddleware");

const router = express.Router();

router.use(authMiddleware, adminMiddleware);

// Dashboard
router.get("/dashboard", adminController.dashboard);

// Products
router.get("/products", adminController.listProducts);
router.get("/products/:id", adminController.getProduct);
router.post("/products", adminController.createProduct);
router.patch("/products", adminController.bulkUpdateProducts);
router.put("/products/:id", adminController.updateProduct);
router.delete("/products/:id", adminController.deleteProduct);
router.patch("/products/:id/variants/:sku", adminController.updateVariant);

// Orders
router.get("/orders", adminController.listOrders);
router.get("/orders/:id", adminController.getOrder);
router.patch("/orders/:id/fulfil", adminController.fulfilOrder);

// Categories
router.get("/categories", adminController.listCategories);
router.post("/categories", adminController.createCategory);
router.put("/categories/:id", adminController.updateCategory);
router.delete("/categories/:id", adminController.deleteCategory);

module.exports = router;
