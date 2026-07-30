/**
 * Authentication and Authorization Middlewares
 */

// Middleware to ensure user is logged in as customer
exports.requireCustomerAuth = (req, res, next) => {
  if (req.session && req.session.user && req.session.user.role === 'customer') {
    return next();
  }
  req.session.returnTo = req.originalUrl;
  return res.redirect('/account/login');
};

// Middleware to ensure user is logged in as admin
exports.requireAdminAuth = (req, res, next) => {
  if (req.session && req.session.admin) {
    return next();
  }
  req.session.returnTo = req.originalUrl;
  return res.redirect('/admin/login');
};

// Redirect if already logged in as customer
exports.redirectIfCustomerAuth = (req, res, next) => {
  if (req.session && req.session.user) {
    return res.redirect('/');
  }
  next();
};

// Redirect if already logged in as admin
exports.redirectIfAdminAuth = (req, res, next) => {
  if (req.session && req.session.admin) {
    return res.redirect('/admin/dashboard');
  }
  next();
};

// Make session variables available to all EJS templates
exports.attachUserToLocals = (req, res, next) => {
  res.locals.currentUser = req.session && req.session.user ? req.session.user : null;
  res.locals.currentAdmin = req.session && req.session.admin ? req.session.admin : null;
  next();
};
