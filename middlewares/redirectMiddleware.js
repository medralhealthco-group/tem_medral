const config = require('../config');
const { normalizePath } = require('../services/navigationService');

// Initialize in-memory Map for O(1) instantaneous redirect lookups
const redirectMap = new Map();

if (Array.isArray(config.redirects)) {
  config.redirects.forEach(rule => {
    if (rule.from && rule.to) {
      redirectMap.set(normalizePath(rule.from), {
        to: rule.to,
        code: rule.code || 301
      });
    }
  });
}

/**
 * Middleware that checks incoming request paths against the normalized redirect map.
 * Executes instantly before routing or view rendering.
 */
function handleRedirects(req, res, next) {
  let reqPath = req.path;
  try {
    reqPath = decodeURIComponent(req.path);
  } catch (e) {
    // fallback to raw req.path if malformed URI
  }

  const normalized = normalizePath(reqPath);
  const target = redirectMap.get(normalized);

  if (target) {
    return res.redirect(target.code, target.to);
  }

  next();
}

module.exports = { handleRedirects };
