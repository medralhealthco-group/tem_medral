const config = require('../config');

/**
 * Normalizes a URL path for consistent matching (lowercasing, stripping query params, trailing slashes, and .html extension).
 * @param {string} rawUrl - Raw input URL path
 * @returns {string} Normalized path string
 */
function normalizePath(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return '/';

  let clean = rawUrl.split('?')[0].split('#')[0].toLowerCase();
  clean = clean.replace(/\/+/g, '/'); // replace multiple slashes with single slash
  if (clean.length > 1 && clean.endsWith('/')) {
    clean = clean.slice(0, -1);
  }
  clean = clean.replace(/\.html$/, '');
  return clean || '/';
}

/**
 * Checks if a target URL matches the current active request path.
 * @param {string} targetUrl - Navigation link URL
 * @param {string} currentPath - Current HTTP request path
 * @returns {boolean}
 */
function isActiveUrl(targetUrl, currentPath) {
  // Placeholder links ('#', '') would otherwise normalize to '/' and light up on the home page.
  if (!targetUrl || targetUrl === '#' || targetUrl.startsWith('#')) return false;

  const normTarget = normalizePath(targetUrl);
  const normCurrent = normalizePath(currentPath);

  if (normTarget === '/' && normCurrent === '/') return true;
  return normTarget !== '/' && normCurrent.startsWith(normTarget);
}

/**
 * Recursively filters disabled navigation items and sorts them by order.
 * @param {Array} items - Array of navigation items
 * @param {string} currentPath - Current active HTTP path
 * @returns {Array} Processed navigation items
 */
function filterAndSortMenu(items, currentPath) {
  if (!Array.isArray(items)) return [];

  return items
    .filter(item => item.enabled !== false)
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .map(item => {
      const processed = {
        ...item,
        isActive: isActiveUrl(item.url, currentPath)
      };

      if (item.children && Array.isArray(item.children)) {
        processed.children = filterAndSortMenu(item.children, currentPath);
      }

      return processed;
    });
}

/**
 * Retrieves the full processed navigation structure for a request.
 * @param {string} currentPath - Current request path
 * @returns {Object} Navigation menu structures
 */
function getNavigation(currentPath) {
  const rawHeader = config.navigation.header || {};
  const rawFooter = config.navigation.footer || {};

  return {
    header: {
      menu: filterAndSortMenu(rawHeader.menu, currentPath),
      cta: filterAndSortMenu(rawHeader.cta, currentPath),
      utilities: (rawHeader.utilities || []).filter(item => item.enabled !== false),
      announcementMessages: rawHeader.announcementMessages || [],
      searchSuggestions: rawHeader.searchSuggestions || []
    },
    footer: {
      quickLinks: filterAndSortMenu(rawFooter.quickLinks, currentPath),
      company: filterAndSortMenu(rawFooter.company, currentPath),
      legal: filterAndSortMenu(rawFooter.legal, currentPath),
      certifications: (rawFooter.certifications || []).filter(c => c.enabled !== false),
      downloads: rawFooter.downloads || {}
    }
  };
}

/**
 * Generates an automatic breadcrumb trail based on the navigation hierarchy.
 * @param {string} currentPath - Current request path
 * @returns {Array} Array of breadcrumb items [{ title, url }]
 */
function getBreadcrumbs(currentPath) {
  const breadcrumbs = [{ title: 'Home', url: '/' }];
  const normCurrent = normalizePath(currentPath);

  if (normCurrent === '/') return breadcrumbs;

  const menu = config.navigation.header ? config.navigation.header.menu : [];

  function searchTree(nodes, trail) {
    for (const node of nodes) {
      if (node.enabled === false) continue;

      const newTrail = [...trail, { title: node.title, url: node.url }];
      const normNodeUrl = normalizePath(node.url);

      if (normNodeUrl === normCurrent) {
        return newTrail;
      }

      if (node.children && node.children.length > 0) {
        const result = searchTree(node.children, newTrail);
        if (result) return result;
      }
    }
    return null;
  }

  const matchedTrail = searchTree(menu, []);
  if (matchedTrail) {
    return [{ title: 'Home', url: '/' }, ...matchedTrail];
  }

  // Fallback if URL is not in main menu
  const segments = currentPath.split('/').filter(Boolean);
  let accumulated = '';
  segments.forEach(seg => {
    accumulated += `/${seg}`;
    const formattedTitle = seg.replace(/[-_]/g, ' ').replace(/\.html$/, '');
    breadcrumbs.push({
      title: formattedTitle.charAt(0).toUpperCase() + formattedTitle.slice(1),
      url: accumulated
    });
  });

  return breadcrumbs;
}

module.exports = {
  normalizePath,
  isActiveUrl,
  getNavigation,
  getBreadcrumbs
};
