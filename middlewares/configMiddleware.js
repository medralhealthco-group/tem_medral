const config = require('../config');
const { getNavigation, getBreadcrumbs } = require('../services/navigationService');
const { getMegaMenu } = require('../services/megamenuService');

/**
 * Global middleware attaching the site configuration namespace and default breadcrumbs to res.locals.
 *
 * Async because the mega menu is designed to be served from the database. The
 * service caches its result, so this stays a memory read on all but the first request.
 */
async function attachConfigToLocals(req, res, next) {
  const currentPath = req.path || '/';

  // Group under a single res.locals.config namespace to avoid variable collisions in templates
  res.locals.config = {
    site: config.site,
    theme: config.theme,
    seo: config.seo,
    contacts: config.contacts,
    offices: config.offices,
    social: config.social,
    navigation: getNavigation(currentPath),
    megamenu: await getMegaMenu()
  };

  // Provide default breadcrumbs (can be overridden by individual route handlers for dynamic pages)
  if (!res.locals.breadcrumbs) {
    res.locals.breadcrumbs = getBreadcrumbs(currentPath);
  }

  res.locals.year = new Date().getFullYear();

  next();
}

module.exports = { attachConfigToLocals };
