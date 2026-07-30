'use strict';

/**
 * Recursively freezes a JavaScript object to prevent runtime mutations.
 * @param {Object} obj - The object to freeze recursively.
 * @returns {Object} The frozen object.
 */
function deepFreeze(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  Object.keys(obj).forEach(prop => {
    if (typeof obj[prop] === 'object' && obj[prop] !== null && !Object.isFrozen(obj[prop])) {
      deepFreeze(obj[prop]);
    }
  });

  return Object.freeze(obj);
}

module.exports = deepFreeze;
