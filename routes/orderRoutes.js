const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");
const { requireCustomerAuth } = require("../middlewares/authMiddleware");
const { checkoutLimiter } = require("../middlewares/securityMiddleware");

// Public Checkout Routes
router.get("/checkout", orderController.renderCheckout);
router.post("/checkout", checkoutLimiter, orderController.handleCheckout);
router.get("/checkout/success/:orderNumber", orderController.renderOrderSuccess);

// Customer Account Orders History (Protected)
router.get("/account/orders", requireCustomerAuth, orderController.renderCustomerOrders);

module.exports = router;
