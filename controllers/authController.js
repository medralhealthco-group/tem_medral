const AuthService = require("../services/authService");
const CartService = require("../services/cartService");
const OrderService = require("../services/orderService");
const UserModel = require("../models/userModel");
const { getSeoMetadata } = require("../utils/seoHelper");

// Render Register Page
exports.renderRegister = (req, res) => {
  const seo = getSeoMetadata("Create Account | Medral Health Co", "Register for a Medral Health customer account.", req, {
    robots: "noindex, nofollow"
  });
  res.render("account/register", { seo, error: null, success: null, formData: {} });
};

// Handle Customer Registration
exports.handleRegister = async (req, res) => {
  const seo = getSeoMetadata("Create Account | Medral Health Co", "Register for a Medral Health customer account.", req, {
    robots: "noindex, nofollow"
  });
  const { firstName, lastName, email, phone, password, confirmPassword } = req.body;
  const formData = { firstName, lastName, email, phone };

  try {
    const userSessionData = await AuthService.registerCustomer({
      firstName,
      lastName,
      email,
      phone,
      password,
      confirmPassword
    });

    const oldSessionId = req.sessionID;

    // Regenerate session after registration to prevent session fixation
    req.session.regenerate(async (regenErr) => {
      if (regenErr) {
        console.error("[AUTH ERROR] Customer Registration session regenerate error:", regenErr);
        return res.status(500).render("account/register", {
          seo,
          error: "An unexpected error occurred during registration. Please try again.",
          success: null,
          formData
        });
      }

      req.session.user = userSessionData;

      try {
        await CartService.mergeGuestCartToUser(oldSessionId, userSessionData.id);
      } catch (cartErr) {
        console.warn("[AUTH WARNING] Guest cart migration warning:", cartErr.message);
      }

      req.session.save((saveErr) => {
        if (saveErr) {
          console.error("[AUTH ERROR] Customer Registration session save error:", saveErr);
        }
        return res.redirect("/");
      });
    });
  } catch (error) {
    return res.status(400).render("account/register", {
      seo,
      error: error.message || "An unexpected error occurred during registration.",
      success: null,
      formData
    });
  }
};

// Render Login Page
exports.renderLogin = (req, res) => {
  const seo = getSeoMetadata("Account Login | Medral Health Co", "Sign in to your Medral Health customer account.", req, { robots: "noindex, nofollow" });
  res.render("account/login", { seo, error: null, success: null, email: "" });
};

// Handle Customer Login
exports.handleLogin = async (req, res) => {
  const seo = getSeoMetadata("Account Login | Medral Health Co", "Sign in to your Medral Health customer account.", req, { robots: "noindex, nofollow" });
  const { email, password } = req.body;

  try {
    const userSessionData = await AuthService.loginCustomer({ email, password });
    const oldSessionId = req.sessionID;
    const returnToUrl = req.session.returnTo || "/";

    // Regenerate session after login to prevent session fixation
    req.session.regenerate(async (regenErr) => {
      if (regenErr) {
        console.error("[AUTH ERROR] Customer Login session regenerate error:", regenErr);
        return res.status(500).render("account/login", {
          seo,
          error: "An unexpected error occurred during login. Please try again.",
          success: null,
          email: email || ""
        });
      }

      req.session.user = userSessionData;

      try {
        await CartService.mergeGuestCartToUser(oldSessionId, userSessionData.id);
      } catch (cartErr) {
        console.warn("[AUTH WARNING] Guest cart migration warning:", cartErr.message);
      }

      req.session.save((saveErr) => {
        if (saveErr) {
          console.error("[AUTH ERROR] Customer Login session save error:", saveErr);
        }
        return res.redirect(returnToUrl);
      });
    });
  } catch (error) {
    return res.status(401).render("account/login", {
      seo,
      error: error.message || "Invalid email or password.",
      success: null,
      email: email || ""
    });
  }
};

// Handle Customer Logout (POST only — destroys the full session)
exports.handleLogout = (req, res) => {
  const redirectTo = '/';

  if (!req.session) {
    res.clearCookie('medral_sid');
    return res.redirect(redirectTo);
  }

  req.session.destroy(err => {
    if (err) {
      console.error('[AUTH ERROR] Customer logout session destroy failed:', err.message);
    }
    res.clearCookie('medral_sid');
    return res.redirect(redirectTo);
  });
};

// Render Customer Portal Dashboard
exports.renderDashboard = async (req, res) => {
  const seo = getSeoMetadata("My Account Dashboard | Medral Health Co", "Customer Portal Dashboard", req, { robots: "noindex, nofollow" });
  const userId = req.session.user.id;

  try {
    const user = await UserModel.findUserById(userId);
    const orders = await OrderService.getCustomerOrders(userId);

    const stats = {
      totalOrders: orders.length,
      pendingOrders: orders.filter(o => o.order_status === "pending" || o.order_status === "processing").length,
      deliveredOrders: orders.filter(o => o.order_status === "delivered").length
    };

    res.render("account/dashboard", {
      seo,
      user,
      stats,
      recentOrders: orders.slice(0, 5)
    });
  } catch (error) {
    console.error("[AUTH ERROR] renderDashboard:", error.message);
    res.redirect("/");
  }
};

// Render Customer Profile Settings Page
exports.renderProfile = async (req, res) => {
  const seo = getSeoMetadata("Profile Settings | Medral Health Co", "Manage your customer profile.", req, { robots: "noindex, nofollow" });
  const userId = req.session.user.id;

  try {
    const user = await UserModel.findUserById(userId);
    res.render("account/profile", {
      seo,
      user,
      error: req.query.error || null,
      success: req.query.success || null
    });
  } catch (error) {
    console.error("[AUTH ERROR] renderProfile:", error.message);
    res.redirect("/account/dashboard");
  }
};

// Handle Profile Info Update
exports.handleUpdateProfile = async (req, res) => {
  const userId = req.session.user.id;
  const { firstName, lastName, phone } = req.body;

  try {
    const updated = await AuthService.updateCustomerProfile(userId, { firstName, lastName, phone });
    req.session.user.firstName = updated.firstName;
    req.session.user.lastName = updated.lastName;

    res.redirect("/account/profile?success=" + encodeURIComponent("Profile updated successfully."));
  } catch (error) {
    res.redirect("/account/profile?error=" + encodeURIComponent(error.message || "Failed to update profile."));
  }
};

// Handle Account Password Update
exports.handleUpdatePassword = async (req, res) => {
  const userId = req.session.user.id;
  const { currentPassword, newPassword, confirmPassword } = req.body;

  try {
    await AuthService.updateCustomerPassword(userId, req.session.user.email, { currentPassword, newPassword, confirmPassword });
    res.redirect("/account/profile?success=" + encodeURIComponent("Password changed successfully."));
  } catch (error) {
    res.redirect("/account/profile?error=" + encodeURIComponent(error.message || "Failed to update password."));
  }
};

// ─── Password recovery ────────────────────────────────────────────────────────

exports.renderForgotPassword = (req, res) => {
  const seo = getSeoMetadata(
    "Forgot Password | Medral Health Co",
    "Reset your Medral Health customer account password.",
    req,
    { robots: "noindex, nofollow" }
  );
  res.render("account/forgot-password", { seo, error: null, success: null, email: "" });
};

exports.handleForgotPassword = async (req, res) => {
  const seo = getSeoMetadata(
    "Forgot Password | Medral Health Co",
    "Reset your Medral Health customer account password.",
    req,
    { robots: "noindex, nofollow" }
  );
  const email = req.body.email || "";

  try {
    const result = await AuthService.requestPasswordReset({ email, req });
    return res.render("account/forgot-password", {
      seo,
      error: null,
      success: result.message,
      email: ""
    });
  } catch (error) {
    return res.status(400).render("account/forgot-password", {
      seo,
      error: error.message || "Unable to process your request.",
      success: null,
      email
    });
  }
};

exports.renderResetPassword = async (req, res) => {
  const seo = getSeoMetadata(
    "Reset Password | Medral Health Co",
    "Choose a new password for your Medral Health account.",
    req,
    { robots: "noindex, nofollow" }
  );
  const token = req.query.token || "";

  try {
    await AuthService.validateResetToken(token);
    return res.render("account/reset-password", {
      seo,
      error: null,
      success: null,
      token,
      tokenValid: true
    });
  } catch (error) {
    return res.status(400).render("account/reset-password", {
      seo,
      error: error.message || "This password reset link is invalid or has expired.",
      success: null,
      token: "",
      tokenValid: false
    });
  }
};

exports.handleResetPassword = async (req, res) => {
  const seo = getSeoMetadata(
    "Reset Password | Medral Health Co",
    "Choose a new password for your Medral Health account.",
    req,
    { robots: "noindex, nofollow" }
  );
  const { token, newPassword, confirmPassword } = req.body;

  try {
    const result = await AuthService.resetPasswordWithToken({
      token,
      newPassword,
      confirmPassword,
      req
    });

    return res.render("account/login", {
      seo: getSeoMetadata(
        "Account Login | Medral Health Co",
        "Sign in to your Medral Health customer account.",
        req,
        { robots: "noindex, nofollow" }
      ),
      error: null,
      success: result.message,
      email: ""
    });
  } catch (error) {
    let tokenValid = false;
    try {
      await AuthService.validateResetToken(token);
      tokenValid = true;
    } catch (_) {
      tokenValid = false;
    }

    return res.status(400).render("account/reset-password", {
      seo,
      error: error.message || "Unable to reset your password.",
      success: null,
      token: tokenValid ? token : "",
      tokenValid
    });
  }
};
