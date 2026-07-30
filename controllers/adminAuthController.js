const AuthService = require("../services/authService");
const { getSeoMetadata } = require("../utils/seoHelper");
const AuditLogger = require("../utils/auditLogger");

// Render Admin Login Page
exports.renderAdminLogin = (req, res) => {
  const seo = getSeoMetadata("Admin Portal Login | Medral Health Co", "Store Administration Portal", req);
  res.render("admin/login", { seo, error: null, email: "" });
};

// Handle Admin Login
exports.handleAdminLogin = async (req, res) => {
  const seo = getSeoMetadata("Admin Portal Login | Medral Health Co", "Store Administration Portal", req);
  const { email, password } = req.body;

  try {
    const adminSessionData = await AuthService.loginAdmin({ email, password });

    AuditLogger.log({
      adminId: adminSessionData.id,
      adminEmail: adminSessionData.email,
      action: "ADMIN_LOGIN_SUCCESS",
      ip: req.ip
    });

    // Regenerate session after admin login to prevent session fixation
    req.session.regenerate((regenErr) => {
      if (regenErr) {
        console.error("[AUTH ERROR] Admin Login session regenerate error:", regenErr);
        return res.status(500).render("admin/login", {
          seo,
          error: "An unexpected authentication error occurred.",
          email: email || ""
        });
      }

      req.session.admin = adminSessionData;

      req.session.save((saveErr) => {
        if (saveErr) {
          console.error("[AUTH ERROR] Admin Login session save error:", saveErr);
        }
        return res.redirect("/admin/dashboard");
      });
    });
  } catch (error) {
    AuditLogger.logFailedLogin({ email, ip: req.ip, reason: error.message });

    return res.status(401).render("admin/login", {
      seo,
      error: error.message || "Invalid administrator credentials.",
      email: email || ""
    });
  }
};

// Handle Admin Logout (POST only — destroys the full session)
exports.handleAdminLogout = (req, res) => {
  const redirectTo = '/admin/login';

  if (!req.session) {
    res.clearCookie('medral_sid');
    return res.redirect(redirectTo);
  }

  req.session.destroy(err => {
    if (err) {
      console.error('[AUTH ERROR] Admin logout session destroy failed:', err.message);
    }
    res.clearCookie('medral_sid');
    return res.redirect(redirectTo);
  });
};

// Render Admin Change Password Page
exports.renderChangePassword = (req, res) => {
  const seo = getSeoMetadata("Change Admin Password | Medral Health Co", "Store Administration Portal", req);
  res.render("admin/change-password", {
    seo,
    activePage: "change-password",
    pageTitle: "Change Password",
    currentAdmin: req.session.admin,
    error: null,
    success: null
  });
};

// Handle Admin Change Password Submission
exports.handleChangePassword = async (req, res) => {
  const seo = getSeoMetadata("Change Admin Password | Medral Health Co", "Store Administration Portal", req);
  const { currentPassword, newPassword, confirmPassword } = req.body;

  try {
    await AuthService.updateAdminPassword(req.session.admin.id, {
      currentPassword,
      newPassword,
      confirmPassword
    });

    return res.render("admin/change-password", {
      seo,
      activePage: "change-password",
      pageTitle: "Change Password",
      currentAdmin: req.session.admin,
      error: null,
      success: "Administrator password updated successfully."
    });
  } catch (error) {
    return res.status(400).render("admin/change-password", {
      seo,
      activePage: "change-password",
      pageTitle: "Change Password",
      currentAdmin: req.session.admin,
      error: error.message || "Failed to update password.",
      success: null
    });
  }
};
