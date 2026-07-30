const rateLimit = require('express-rate-limit');
const sanitizeHtml = require('sanitize-html');
const crypto = require('crypto');

// General site rate limiter (300 requests per 15 mins)
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    message: 'Too many requests from this IP address. Please try again later.'
  }
});

// Authentication rate limiter (15 requests per 15 mins)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    message: 'Too many login/registration attempts. Please wait 15 minutes before trying again.'
  }
});

// Admin Login rate limiter (5 requests per 15 mins)
const adminAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    message: 'Too many administrative login attempts. Please wait 15 minutes before trying again.'
  }
});

// Checkout rate limiter (20 requests per 15 mins)
const checkoutLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    message: 'Too many checkout submissions. Please try again later.'
  }
});

// Contact / enquiry rate limiter (8 submissions per 15 mins)
const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    message: 'Too many contact submissions. Please wait a few minutes and try again.'
  }
});

// Password reset rate limiter (5 requests per 15 mins)
const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    message: 'Too many password reset attempts. Please wait 15 minutes before trying again.'
  }
});

// Helper function to recursively sanitize values using sanitize-html
function sanitizeValue(val) {
  if (typeof val === 'string') {
    return sanitizeHtml(val, {
      allowedTags: [],
      allowedAttributes: {},
      disallowedTagsMode: 'discard'
    }).trim();
  } else if (Array.isArray(val)) {
    return val.map(sanitizeValue);
  } else if (val !== null && typeof val === 'object') {
    const cleaned = {};
    for (const key in val) {
      cleaned[key] = sanitizeValue(val[key]);
    }
    return cleaned;
  }
  return val;
}

// Industry-Standard Input Sanitization Middleware using sanitize-html
function sanitizeBody(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeValue(req.body);
  }
  next();
}

// Session-Based CSRF Protection Middleware
function safeEqualCsrf(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || !a || !b) {
    return false;
  }
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) {
    // Consume comparable work to reduce length-oracle timing skew
    crypto.timingSafeEqual(bufA, Buffer.alloc(bufA.length));
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

function rejectInvalidCsrf(req, res) {
  console.warn(
    `[SECURITY WARNING] Invalid or missing CSRF token on ${req.method} ${req.originalUrl} from IP ${req.ip}`
  );

  if (
    req.xhr ||
    (req.headers.accept && req.headers.accept.includes('application/json')) ||
    req.path.startsWith('/cart/')
  ) {
    return res.status(403).json({
      success: false,
      message: 'Invalid or missing CSRF security token. Please refresh the page and try again.'
    });
  }

  return res
    .status(403)
    .send(
      'CSRF token validation failed. Please return to the previous page, refresh, and resubmit.'
    );
}

function extractCsrfToken(req) {
  return (req.body && req.body._csrf) || req.headers['x-csrf-token'] || req.headers['csrf-token'];
}

function csrfProtection(req, res, next) {
  if (res && !res.locals) {
    res.locals = {};
  }
  if (req.session) {
    if (!req.session.csrfToken) {
      req.session.csrfToken = crypto.randomBytes(32).toString('hex');
    }
    if (res && res.locals) {
      res.locals.csrfToken = req.session.csrfToken;
    }
  } else if (res && res.locals) {
    res.locals.csrfToken = '';
  }

  // Safe HTTP methods do not alter state
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Never accept CSRF from query string (Referer/logs leakage). Ignore if present.
  if (req.query && Object.prototype.hasOwnProperty.call(req.query, '_csrf')) {
    console.warn(
      `[SECURITY WARNING] CSRF token supplied via query string on ${req.method} ${req.path} from IP ${req.ip} — ignored`
    );
  }

  const contentType = String(req.headers['content-type'] || '');
  const isMultipart = contentType.includes('multipart/form-data');
  const headerToken = req.headers['x-csrf-token'] || req.headers['csrf-token'];

  // Multipart bodies are not parsed until multer runs. Defer CSRF only on known
  // upload routes that call csrfAfterMultipart after multer.
  if (isMultipart && !headerToken) {
    const url = String(req.originalUrl || req.path || '').split('?')[0];
    const canDefer =
      url === '/admin/products/create' || /^\/admin\/products\/edit\/\d+$/.test(url);
    if (canDefer) {
      req.csrfDeferred = true;
      return next();
    }
  }

  const token = extractCsrfToken(req);
  const sessionToken = req.session && req.session.csrfToken;
  if (!safeEqualCsrf(token, sessionToken)) {
    return rejectInvalidCsrf(req, res);
  }

  next();
}

// Run after multer (or any multipart parser) populates req.body._csrf
function csrfAfterMultipart(req, res, next) {
  if (!req.csrfDeferred) {
    return next();
  }
  req.csrfDeferred = false;

  const token = extractCsrfToken(req);
  const sessionToken = req.session && req.session.csrfToken;
  if (!safeEqualCsrf(token, sessionToken)) {
    return rejectInvalidCsrf(req, res);
  }
  return next();
}

module.exports = {
  generalLimiter,
  authLimiter,
  adminAuthLimiter,
  checkoutLimiter,
  contactLimiter,
  passwordResetLimiter,
  sanitizeBody,
  csrfProtection,
  csrfAfterMultipart
};
