const express = require("express");
const router = express.Router();
const adminOrderController = require("../controllers/adminOrderController");
const { requireAdminAuth } = require("../middlewares/authMiddleware");

// All admin order routes require admin authentication
router.use(requireAdminAuth);

// Order Listing & Filtering
router.get("/", adminOrderController.listOrders);

// Order Single Detail View
router.get("/view/:id", adminOrderController.viewOrderDetail);

// Update Status Actions
router.post("/update-status/:id", adminOrderController.handleUpdateStatus);
router.post("/update-payment-status/:id", adminOrderController.handleUpdatePaymentStatus);

module.exports = router;
