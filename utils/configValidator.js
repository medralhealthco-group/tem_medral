const logger = require('./logger');

/**
 * Validates site and navigation configuration at server startup.
 * Fails fast by throwing an Error if configuration errors are detected.
 * @param {Object} config - The aggregated site configuration object.
 */
function validateConfig(config) {
  const errors = [];
  const seenIds = new Set();
  const seenUrls = new Set();

  if (!config) {
    throw new Error('[CONFIG VALIDATION] Configuration object is missing');
  }

  // Helper to validate navigation item recursively
  function validateNavItem(item, parentId = null) {
    if (!item.id || typeof item.id !== 'string') {
      errors.push(`Navigation item missing valid 'id': ${JSON.stringify(item)}`);
    } else if (seenIds.has(item.id)) {
      errors.push(`Duplicate item ID detected: '${item.id}'`);
    } else {
      seenIds.add(item.id);
    }

    if (!item.title || typeof item.title !== 'string') {
      errors.push(`Navigation item '${item.id || 'unknown'}' missing required string 'title'`);
    }

    if (item.url === undefined || item.url === null) {
      errors.push(`Navigation item '${item.id || 'unknown'}' missing required 'url'`);
    } else if (item.url === parentId) {
      errors.push(`Navigation item '${item.id}' has self-referencing URL: '${item.url}'`);
    }

    if (item.children && Array.isArray(item.children)) {
      const childOrders = new Set();
      item.children.forEach(child => {
        if (child.order !== undefined) {
          if (childOrders.has(child.order)) {
            errors.push(`Duplicate sort order '${child.order}' among children of '${item.id}'`);
          }
          childOrders.add(child.order);
        }
        validateNavItem(child, item.id);
      });
    }
  }

  // Validate Header Menu
  if (
    config.navigation &&
    config.navigation.header &&
    Array.isArray(config.navigation.header.menu)
  ) {
    const topOrders = new Set();
    config.navigation.header.menu.forEach(item => {
      if (item.order !== undefined) {
        if (topOrders.has(item.order)) {
          errors.push(`Duplicate sort order '${item.order}' in header main menu`);
        }
        topOrders.add(item.order);
      }
      validateNavItem(item);
    });
  }

  // Validate Social Profiles
  if (Array.isArray(config.social)) {
    config.social.forEach(social => {
      if (!social.id || seenIds.has(social.id)) {
        errors.push(`Invalid or duplicate social profile ID: '${social.id}'`);
      } else {
        seenIds.add(social.id);
      }
    });
  }

  // Validate Redirects
  if (Array.isArray(config.redirects)) {
    config.redirects.forEach(red => {
      if (!red.from || !red.to) {
        errors.push(`Redirect rule missing 'from' or 'to': ${JSON.stringify(red)}`);
      } else if (red.from === red.to) {
        errors.push(`Self-referencing redirect detected for: '${red.from}'`);
      }

      if (red.code && ![301, 302, 307, 308].includes(red.code)) {
        errors.push(`Invalid HTTP redirect status code '${red.code}' for '${red.from}'`);
      }
    });
  }

  if (errors.length > 0) {
    logger.error('[CONFIG VALIDATION FAILED] Startup aborted due to configuration errors:');
    errors.forEach(err => logger.error(`  - ${err}`));
    throw new Error(
      `[FATAL] Site configuration validation failed with ${errors.length} error(s): ${errors.join('; ')}`
    );
  }

  logger.info('[CONFIG VALIDATION PASSED] Site configuration is valid.');
  return true;
}

module.exports = { validateConfig };
