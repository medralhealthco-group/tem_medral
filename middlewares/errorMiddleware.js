// 404 Not Found Middleware
function notFoundHandler(req, res, next) {
  const { getSeoMetadata } = require('../utils/seoHelper');
  const seo = getSeoMetadata(
    '404 Page Not Found | Medral Health Co',
    'The requested page could not be found.',
    req,
    { robots: 'noindex, follow' }
  );

  res.status(404).render('pages/404', { seo });
}

// Global Error Handler Middleware
function globalErrorHandler(err, req, res, next) {
  console.error('[SERVER ERROR]', err.stack || err.message || err);

  const status = err.status || 500;

  if (res.headersSent) {
    return next(err);
  }

  const { getSeoMetadata } = require('../utils/seoHelper');
  const seo = getSeoMetadata(
    `${status} ${status === 404 ? 'Page Not Found' : 'Server Error'} | Medral Health Co`,
    status === 404
      ? 'The requested page could not be found.'
      : 'An unexpected error occurred. Please try again later.',
    req,
    { robots: 'noindex, follow' }
  );

  if (process.env.NODE_ENV !== 'production' && err.message) {
    seo.description = `${seo.description} (${err.message})`;
  }

  res.status(status).render('pages/404', { seo });
}

module.exports = {
  notFoundHandler,
  globalErrorHandler
};
