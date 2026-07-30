/**
 * Utility function to convert strings to clean, URL-safe slugs.
 * Example: "Whey Protein Isolate!" -> "whey-protein-isolate"
 *
 * @param {string} text - Plain text input
 * @returns {string} - URL safe slug
 */
function slugify(text) {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, '-') // Replace spaces and underscores with -
    .replace(/[^\w\-]+/g, '') // Remove all non-word chars
    .replace(/\-\-+/g, '-') // Replace multiple - with single -
    .replace(/^-+/, '') // Trim - from start of text
    .replace(/-+$/, ''); // Trim - from end of text
}

module.exports = slugify;
