const crypto = require('crypto');

/**
 * Per-request CSP nonce for inline <script> / <style> elements.
 * Exposed as res.locals.cspNonce for EJS templates.
 */
function cspNonce(req, res, next) {
  const nonce = crypto.randomBytes(16).toString('base64');
  res.locals.cspNonce = nonce;
  // Also set on req for Helmet directive callbacks
  req.cspNonce = nonce;
  next();
}

/**
 * Build Helmet options with nonce-based CSP (no script-src 'unsafe-inline').
 * style-src-attr / script-src-attr keep attribute handlers/styles working
 * without allowing injected <script> or <style> blocks.
 */
function buildHelmetOptions() {
  const isProd = process.env.NODE_ENV === 'production';

  return {
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        defaultSrc: ["'self'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'self'"],
        objectSrc: ["'none'"],
        imgSrc: [
          "'self'",
          'data:',
          'blob:',
          'https://images.unsplash.com',
          'https://placehold.co',
          'https://*.unsplash.com'
        ],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
        connectSrc: ["'self'"],
        frameSrc: ["'self'"],
        workerSrc: ["'self'", 'blob:'],
        manifestSrc: ["'self'"],
        // Element scripts: self + per-request nonce only (no unsafe-inline)
        scriptSrc: [
          "'self'",
          (req, res) => `'nonce-${res.locals.cspNonce || req.cspNonce}'`
        ],
        scriptSrcElem: [
          "'self'",
          (req, res) => `'nonce-${res.locals.cspNonce || req.cspNonce}'`
        ],
        // Attribute handlers (onclick, etc.) — narrower than script-src unsafe-inline
        scriptSrcAttr: ["'unsafe-inline'"],
        // Element stylesheets + nonced <style> blocks
        styleSrc: [
          "'self'",
          (req, res) => `'nonce-${res.locals.cspNonce || req.cspNonce}'`,
          'https://fonts.googleapis.com'
        ],
        styleSrcElem: [
          "'self'",
          (req, res) => `'nonce-${res.locals.cspNonce || req.cspNonce}'`,
          'https://fonts.googleapis.com'
        ],
        // Inline style="" attributes used throughout legacy templates
        styleSrcAttr: ["'unsafe-inline'"],
        upgradeInsecureRequests: isProd ? [] : null
      }
    },
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: { policy: 'same-origin' },
    crossOriginResourcePolicy: { policy: 'same-site' },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    frameguard: { action: 'sameorigin' },
    noSniff: true,
    xssFilter: false, // deprecated; CSP is the control
    hidePoweredBy: true,
    hsts: isProd
      ? { maxAge: 31536000, includeSubDomains: true, preload: true }
      : false,
    permittedCrossDomainPolicies: { permittedPolicies: 'none' },
    originAgentCluster: true
  };
}

module.exports = {
  cspNonce,
  buildHelmetOptions
};
