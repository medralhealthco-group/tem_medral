const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { redirectIfCustomerAuth, requireCustomerAuth } = require("../middlewares/authMiddleware");
const { authLimiter, passwordResetLimiter } = require("../middlewares/securityMiddleware");

// Customer Registration
router.get("/register", redirectIfCustomerAuth, authController.renderRegister);
router.post("/register", authLimiter, redirectIfCustomerAuth, authController.handleRegister);

// Customer Login
router.get("/login", redirectIfCustomerAuth, authController.renderLogin);
router.post("/login", authLimiter, redirectIfCustomerAuth, authController.handleLogin);

// Password recovery (customer)
router.get("/forgot-password", redirectIfCustomerAuth, authController.renderForgotPassword);
router.post(
  "/forgot-password",
  passwordResetLimiter,
  redirectIfCustomerAuth,
  authController.handleForgotPassword
);
router.get("/reset-password", redirectIfCustomerAuth, authController.renderResetPassword);
router.post(
  "/reset-password",
  passwordResetLimiter,
  redirectIfCustomerAuth,
  authController.handleResetPassword
);

// Customer Logout (POST only — prevents CSRF logout via GET)
router.post("/logout", authController.handleLogout);

// Customer Portal Protected Routes
router.get("/dashboard", requireCustomerAuth, authController.renderDashboard);
router.get("/profile", requireCustomerAuth, authController.renderProfile);
router.post("/profile", requireCustomerAuth, authController.handleUpdateProfile);
router.post("/password", authLimiter, requireCustomerAuth, authController.handleUpdatePassword);

module.exports = router;
