const express = require("express");
const router = express.Router();
const cartController = require("../controllers/cartController");

// Full Cart Page View
router.get("/", cartController.renderCartPage);

// Cart API Endpoints
router.get("/api", cartController.getCartJson);
router.post("/add", cartController.addToCart);
router.post("/update", cartController.updateQuantity);
router.post("/remove", cartController.removeItem);
router.post("/clear", cartController.clearCart);

module.exports = router;
