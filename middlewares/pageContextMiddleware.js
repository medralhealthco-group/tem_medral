/**
 * Middleware that extracts structured section, page, and slug context for view templates.
 */
function attachPageContext(req, res, next) {
  const currentPath = req.path || '/';
  const segments = currentPath.split('/').filter(Boolean);

  const section = segments[0] ? segments[0].replace(/\.html$/, '') : 'home';
  const page = segments[1] ? segments[1].replace(/\.html$/, '') : section;
  const slug = segments[segments.length - 1]
    ? segments[segments.length - 1].replace(/\.html$/, '')
    : 'home';

  res.locals.pageContext = {
    section,
    page,
    slug,
    fullPath: currentPath
  };

  next();
}

module.exports = { attachPageContext };
