const express = require("express");
const router = express.Router();
const shopController = require("../controllers/shopController");

// Public Shop Catalog Page
router.get("/", shopController.renderShop);

// Public Category Shop Page
router.get("/category/:slug", shopController.renderCategoryShop);

// Public Product Detail Page
router.get("/product/:slug", shopController.renderProductDetail);

// Public Instant Live Search AJAX Endpoint
router.get("/api/search", shopController.apiLiveSearch);

module.exports = router;
