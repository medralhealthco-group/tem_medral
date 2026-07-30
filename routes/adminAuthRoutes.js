const express = require("express");
const router = express.Router();
const adminAuthController = require("../controllers/adminAuthController");
const adminController = require("../controllers/adminController");
const { requireAdminAuth, redirectIfAdminAuth } = require("../middlewares/authMiddleware");
const { adminAuthLimiter } = require("../middlewares/securityMiddleware");

// Admin Root Redirect
router.get("/", (req, res) => {
  if (req.session && req.session.admin) {
    return res.redirect("/admin/dashboard");
  }
  return res.redirect("/admin/login");
});

// Admin Login
router.get("/login", redirectIfAdminAuth, adminAuthController.renderAdminLogin);
router.post("/login", adminAuthLimiter, redirectIfAdminAuth, adminAuthController.handleAdminLogin);

// Admin Dashboard
router.get("/dashboard", requireAdminAuth, adminController.renderDashboard);

// Admin Change Password
router.get("/change-password", requireAdminAuth, adminAuthController.renderChangePassword);
router.post("/change-password", requireAdminAuth, adminAuthController.handleChangePassword);

// Admin Logout (POST only — prevents CSRF logout via GET)
router.post("/logout", adminAuthController.handleAdminLogout);

module.exports = router;
