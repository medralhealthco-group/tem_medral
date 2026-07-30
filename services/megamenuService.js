const config = require('../config');

/**
 * Resolves mega menu taxonomy into the single view model the header renders.
 *
 * Everything the templates need is computed here — URLs, truncation, active state —
 * so the EJS layer stays a dumb renderer. Swapping the placeholder config for live
 * database rows means changing SOURCE below; the returned shape does not change.
 *
 * View model:
 *   {
 *     enabled, viewAll: { label, url }, fallbackImage,
 *     tabs: [{
 *       id, label,
 *       groups: [{ id, slug, label, url, products: [{ id, slug, name, url, image, imageAlt }] }]
 *     }]
 *   }
 */

/** Live catalog drives the mega menu; taxonomy tabs still come from config/megamenu.js. */
const SOURCE = 'database';

/** Resolved menus are identical for every visitor, so one cached copy serves all. */
const CACHE_TTL_MS = 5 * 60 * 1000;

let cache = null;
let cacheExpiresAt = 0;

function categoryUrl(slug, linkMode) {
  return linkMode === 'live' ? `/shop/category/${slug}` : '/shop';
}

function productUrl(slug, linkMode) {
  return linkMode === 'live' ? `/shop/product/${slug}` : '/shop';
}

/**
 * Builds the view model from config/megamenu.js placeholder data.
 * @param {Object} source - Raw megamenu config
 * @returns {Object} Mega menu view model
 */
function buildFromConfig(source) {
  const { linkMode, maxProductsPerGroup } = source;

  const tabs = (source.tabs || []).map(tab => ({
    id: tab.id,
    label: tab.label,
    groups: (tab.groups || []).map(group => ({
      id: `${tab.id}-${group.slug}`,
      slug: group.slug,
      label: group.label,
      url: categoryUrl(group.slug, linkMode),
      products: (group.products || []).slice(0, maxProductsPerGroup).map(product => ({
        id: `${tab.id}-${group.slug}-${product.slug}`,
        slug: product.slug,
        name: product.name,
        url: productUrl(product.slug, linkMode),
        image: product.image,
        imageAlt: product.name
      }))
    }))
  }));

  return {
    enabled: source.enabled !== false,
    viewAll: source.viewAll,
    fallbackImage: source.placeholderFallbackImage,
    tabs
  };
}

/**
 * Builds the view model from live category and product tables.
 *
 * Deliberately kept alongside the config builder so the migration is a one-line
 * change to SOURCE. Category slugs listed in config/megamenu.js decide which tab a
 * category belongs to and in what order, which is the one thing the schema cannot
 * express yet; everything else comes from the database.
 *
 * @param {Object} source - Raw megamenu config used for tab grouping and ordering
 * @returns {Promise<Object>} Mega menu view model
 */
async function buildFromDatabase(source) {
  const CategoryModel = require('../models/categoryModel');
  const ProductModel = require('../models/productModel');

  const categories = await CategoryModel.getAllCategories(true);
  const bySlug = new Map(categories.map(category => [category.slug, category]));

  const tabs = await Promise.all(
    (source.tabs || []).map(async tab => {
      const groups = await Promise.all(
        (tab.groups || []).map(async group => {
          const category = bySlug.get(group.slug);
          if (!category) return null;

          const products = await ProductModel.getShopProducts({
            page: 1,
            limit: source.maxProductsPerGroup,
            categoryId: category.id
          });

          return {
            id: `${tab.id}-${category.slug}`,
            slug: category.slug,
            label: category.name,
            url: categoryUrl(category.slug, 'live'),
            products: (products || []).map(product => ({
              id: `${tab.id}-${category.slug}-${product.slug}`,
              slug: product.slug,
              name: product.title,
              url: productUrl(product.slug, 'live'),
              image: product.primary_image || source.placeholderFallbackImage,
              imageAlt: product.title
            }))
          };
        })
      );

      return { id: tab.id, label: tab.label, groups: groups.filter(Boolean) };
    })
  );

  return {
    enabled: source.enabled !== false,
    viewAll: source.viewAll,
    fallbackImage: source.placeholderFallbackImage,
    tabs
  };
}

/** Empty view model used when the menu is disabled or a data source fails. */
function emptyMenu(source) {
  return {
    enabled: false,
    viewAll: (source && source.viewAll) || { label: 'View All', url: '/shop' },
    fallbackImage: source && source.placeholderFallbackImage,
    tabs: []
  };
}

/**
 * Returns the cached mega menu view model, rebuilding it when the cache expires.
 * Never throws — a data failure degrades the header to a plain link rather than
 * taking down every page on the site.
 * @returns {Promise<Object>} Mega menu view model
 */
async function getMegaMenu() {
  const source = config.megamenu;

  if (!source || source.enabled === false) return emptyMenu(source);

  const now = Date.now();
  if (cache && now < cacheExpiresAt) return cache;

  try {
    cache = SOURCE === 'database' ? await buildFromDatabase(source) : buildFromConfig(source);
  } catch (error) {
    console.error('[MEGAMENU ERROR] Falling back to empty menu:', error.message);
    return emptyMenu(source);
  }

  cacheExpiresAt = now + CACHE_TTL_MS;
  return cache;
}

/** Clears the cache. Call after admin edits to categories or products. */
function invalidateMegaMenuCache() {
  cache = null;
  cacheExpiresAt = 0;
}

module.exports = {
  getMegaMenu,
  invalidateMegaMenuCache
};
