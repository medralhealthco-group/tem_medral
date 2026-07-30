const siteConfig = require('../config/site');
const seoConfig = require('../config/seo');
const themeConfig = require('../config/theme');

/**
 * Canonical production origin for SEO (canonicals, OG, sitemap, robots).
 * Prefer SITE_URL / APP_URL; fall back to config in production, else request host.
 */
function getSiteOrigin(req) {
  const fromEnv = (process.env.SITE_URL || process.env.APP_URL || '').trim().replace(/\/$/, '');
  if (fromEnv) return fromEnv;

  if (process.env.NODE_ENV === 'production') {
    return String(siteConfig.website || 'https://www.medralhealth.com').replace(/\/$/, '');
  }

  const protocol = (req && req.protocol) || 'http';
  const host = (req && req.get && req.get('host')) || 'localhost:3000';
  return `${protocol}://${host}`;
}

/** Turn a path or absolute URL into an absolute https URL on the site origin. */
function toAbsoluteUrl(origin, pathOrUrl) {
  if (!pathOrUrl) return origin;
  const value = String(pathOrUrl).trim();
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith('//')) return `https:${value}`;
  const path = value.startsWith('/') ? value : `/${value}`;
  return `${origin}${path}`;
}

/**
 * Build consistent SEO metadata for EJS templates.
 *
 * @param {string} title
 * @param {string|object} description - Meta description, or Express req (flexible signature)
 * @param {object} [req]
 * @param {object} [options] - image, type, robots, path (override canonical path)
 */
function getSeoMetadata(title, description, req, options = {}) {
  let desc = description;
  let requestObj = req;
  let opts = options;

  if (description && typeof description === 'object' && description.protocol) {
    requestObj = description;
    desc = '';
    opts = req && typeof req === 'object' && !req.protocol ? req : {};
  }

  const origin = getSiteOrigin(requestObj);
  const rawPath =
    (opts && opts.path) ||
    (requestObj && requestObj.originalUrl ? requestObj.originalUrl.split('?')[0] : '/');
  const normalizedPath = rawPath === '' ? '/' : rawPath;
  const canonicalUrl = toAbsoluteUrl(origin, normalizedPath === '/' ? '/' : normalizedPath);

  const metaTitle = title || seoConfig.defaultTitle || 'Medral Health Co';
  const metaDesc =
    desc ||
    seoConfig.defaultDescription ||
    'Medral Health Co - Premium Supplements & Sports Nutrition';
  const metaImage = toAbsoluteUrl(
    origin,
    (opts && opts.image) || seoConfig.ogImage || themeConfig.logo
  );
  const metaType = (opts && opts.type) || 'website';
  const robots = (opts && opts.robots) || null;

  return {
    title: metaTitle,
    description: metaDesc,
    canonicalUrl,
    siteOrigin: origin,
    robots,
    ogTitle: metaTitle,
    ogDescription: metaDesc,
    ogUrl: canonicalUrl,
    ogImage: metaImage,
    ogType: metaType,
    ogSiteName: siteConfig.companyName || 'Medral Health Co',
    twitterCard: 'summary_large_image',
    twitterTitle: metaTitle,
    twitterDescription: metaDesc,
    twitterImage: metaImage,
    twitterSite: seoConfig.twitterHandle || null
  };
}

module.exports = {
  getSeoMetadata,
  getSiteOrigin,
  toAbsoluteUrl
};
