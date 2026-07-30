require('dotenv').config();
const express = require('express');
const path = require('path');
const compression = require('compression');
const helmet = require('helmet');
const session = require('express-session');
const crypto = require('crypto');

const MySQLStore = require('express-mysql-session')(session);

const mainRoutes = require('./routes/index');
const seoRoutes = require('./routes/seo');
const authRoutes = require('./routes/authRoutes');
const adminAuthRoutes = require('./routes/adminAuthRoutes');
const adminCategoryRoutes = require('./routes/adminCategoryRoutes');
const adminSubcategoryRoutes = require('./routes/adminSubcategoryRoutes');
const adminProductRoutes = require('./routes/adminProductRoutes');
const adminOrderRoutes = require('./routes/adminOrderRoutes');
const shopRoutes = require('./routes/shopRoutes');
const cartRoutes = require('./routes/cartRoutes');
const orderRoutes = require('./routes/orderRoutes');
const contactRoutes = require('./routes/contactRoutes');

const { attachUserToLocals } = require('./middlewares/authMiddleware');
const { handleRedirects } = require('./middlewares/redirectMiddleware');
const { attachConfigToLocals } = require('./middlewares/configMiddleware');
const { attachPageContext } = require('./middlewares/pageContextMiddleware');
const {
  generalLimiter,
  sanitizeBody,
  csrfProtection
} = require('./middlewares/securityMiddleware');
const { cspNonce, buildHelmetOptions } = require('./middlewares/cspMiddleware');
const { notFoundHandler, globalErrorHandler } = require('./middlewares/errorMiddleware');
const { pool, testConnection } = require('./config/database');
const { validateEnv } = require('./utils/envValidator');
const { validateConfig } = require('./utils/configValidator');
const config = require('./config');
const logger = require('./utils/logger');

// ─── 1. Environment & Configuration Validation (fails fast if misconfigured) ─
validateEnv();
validateConfig(config);

const app = express();
const PORT = process.env.PORT || 3000;
const SHOW_COMING_SOON = process.env.SHOW_COMING_SOON === 'true';

// Hide Express fingerprint
app.disable('x-powered-by');
app.set('etag', 'weak');

// ─── 2. Persistent Session Store backed by MySQL Database Pool ────────────────
const sessionStore = new MySQLStore(
  {
    createDatabaseTable: true,
    clearExpired: true,
    checkExpirationInterval: 900000,
    expiration: 86400000,
    schema: {
      tableName: 'sessions',
      columnNames: {
        session_id: 'session_id',
        expires: 'expires',
        data: 'data'
      }
    }
  },
  pool
);

// Session Secret Enforcement
const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
  if (process.env.NODE_ENV === 'production') {
    logger.error('[SECURITY] SESSION_SECRET is required in production. Refusing to start.');
    process.exit(1);
  }
  logger.warn(
    '[SECURITY] SESSION_SECRET environment variable is not defined. Using fallback — NOT safe for production.'
  );
}

// ─── 3. Core Middleware ───────────────────────────────────────────────────────

// Enable trust proxy for Hostinger / Nginx / reverse proxies
app.set('trust proxy', 1);

// Per-request CSP nonce (must run before Helmet)
app.use(cspNonce);

// Security Middleware (Helmet with nonce CSP & hardened headers)
app.use(helmet(buildHelmetOptions()));

// Extra hardening headers not fully covered by Helmet defaults we disabled
app.use((req, res, next) => {
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.removeHeader('X-Powered-By');
  next();
});

// Structured HTTP Request Logging
app.use(logger.httpMiddleware);

// Response Compression Middleware (Gzip/Brotli Top-Level Optimization)
app.use(compression());

// General Rate Limiting Middleware
app.use(generalLimiter);

// Body Parsers & Input Sanitization
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(sanitizeBody);

// Set EJS as view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.locals.root = path.join(__dirname, 'views');

// Serve static files with 1-Year Long-Term Immutable Browser Caching
const staticOptions = {
  maxAge: '30d',
  setHeaders: res => {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  }
};
app.use('/assets', express.static(path.join(__dirname, 'assets'), staticOptions));
app.use('/images', express.static(path.join(__dirname, 'images'), staticOptions));

// User uploads are mutable and must not be immutable-cached or directory-listed
const uploadStaticOptions = {
  maxAge: '1d',
  index: false,
  dotfiles: 'deny',
  fallthrough: true,
  setHeaders: res => {
    res.setHeader('Cache-Control', 'public, max-age=86400, must-revalidate');
    res.setHeader('X-Content-Type-Options', 'nosniff');
  }
};
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads'), uploadStaticOptions));

// Asset Fingerprinting Version
// Set on app.locals as well so views rendered outside the normal middleware chain
// (early error responses) still resolve `assetVersion` instead of throwing.
app.locals.assetVersion = process.env.ASSET_VERSION || '1.0.0';
app.locals.cspNonce = '';
app.use((req, res, next) => {
  res.locals.assetVersion = process.env.ASSET_VERSION || '1.0.0';
  next();
});

// Coming Soon Middleware Toggle
app.use((req, res, next) => {
  if (SHOW_COMING_SOON && !req.path.startsWith('/assets') && !req.path.startsWith('/images')) {
    return res.render('coming-soon');
  }
  next();
});

// Production-Ready Persistent Session Middleware
app.use(
  session({
    key: 'medral_sid',
    secret: sessionSecret || 'medral_health_session_secret',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000,
      sameSite: 'lax'
    }
  })
);

// Handle HTTP Redirects prior to authentication or session loading
app.use(handleRedirects);

// Attach session user/admin to res.locals for EJS templates
app.use(attachUserToLocals);

// Attach site-wide config namespace and breadcrumb defaults to res.locals
app.use(attachConfigToLocals);

// Attach structured page context (section, page, slug) to res.locals
app.use(attachPageContext);

// CSRF Token Generation & Validation Middleware
app.use(csrfProtection);

// ─── 4. Health Check Endpoint ─────────────────────────────────────────────────
// Used by PM2, Docker HEALTHCHECK, and uptime monitors.
// Public response is minimal (no env/memory/version disclosure).
// Detailed diagnostics require header: X-Health-Token: $HEALTH_TOKEN
app.get('/health', async (req, res) => {
  let dbOk = true;

  try {
    await pool.query('SELECT 1');
  } catch (err) {
    dbOk = false;
    logger.error('[HEALTH] Database ping failed', { error: err.message });
  }

  const status = dbOk ? 'ok' : 'degraded';
  const httpStatus = dbOk ? 200 : 503;

  const healthToken = process.env.HEALTH_TOKEN;
  const provided = req.get('x-health-token') || '';
  const allowDetails =
    Boolean(healthToken) &&
    provided.length === healthToken.length &&
    crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(healthToken));

  if (!allowDetails) {
    return res.status(httpStatus).json({ status });
  }

  const memUsage = process.memoryUsage();
  return res.status(httpStatus).json({
    status,
    timestamp: new Date().toISOString(),
    uptime_seconds: Math.floor(process.uptime()),
    database: { status: dbOk ? 'ok' : 'unavailable' },
    memory: {
      rss_mb: Math.round(memUsage.rss / 1024 / 1024),
      heap_used_mb: Math.round(memUsage.heapUsed / 1024 / 1024)
    }
  });
});

// ─── 5. Application Routes ────────────────────────────────────────────────────
app.use('/', seoRoutes);
app.use('/shop', shopRoutes);
app.use('/cart', cartRoutes);
app.use('/', orderRoutes);
app.use('/', contactRoutes);
app.use('/account', authRoutes);
app.use('/admin/categories', adminCategoryRoutes);
app.use('/admin/subcategories', adminSubcategoryRoutes);
app.use('/admin/products', adminProductRoutes);
app.use('/admin/orders', adminOrderRoutes);
app.use('/admin', adminAuthRoutes);
app.use('/', mainRoutes);

// 404 & 500 Centralized Error Handlers
app.use(notFoundHandler);
app.use(globalErrorHandler);

// ─── 6. Start Server & Graceful Shutdown ──────────────────────────────────────
let server;
if (require.main === module) {
  server = app.listen(PORT, async () => {
    logger.info('Server started', {
      port: PORT,
      env: process.env.NODE_ENV || 'development',
      url: `http://localhost:${PORT}`
    });
    await testConnection();
  });
}

/**
 * Graceful shutdown handler.
 * Stops accepting new connections, waits for in-flight requests to complete,
 * then closes the database pool and session store before exiting.
 *
 * @param {string} signal - The OS signal that triggered shutdown.
 */
function gracefulShutdown(signal) {
  logger.info(`[SHUTDOWN] Received ${signal}. Beginning graceful shutdown...`);

  // Stop accepting new connections — give in-flight requests 10s to complete
  server.close(async err => {
    if (err) {
      logger.error('[SHUTDOWN] HTTP server close error', { error: err.message });
    } else {
      logger.info('[SHUTDOWN] HTTP server closed. No longer accepting new connections.');
    }

    // Close the MySQL session store connection
    try {
      sessionStore.close();
      logger.info('[SHUTDOWN] Session store closed.');
    } catch (storeErr) {
      logger.error('[SHUTDOWN] Session store close error', { error: storeErr.message });
    }

    // Close the database pool
    try {
      await pool.end();
      logger.info('[SHUTDOWN] Database pool closed.');
    } catch (poolErr) {
      logger.error('[SHUTDOWN] Database pool close error', { error: poolErr.message });
    }

    logger.info('[SHUTDOWN] Graceful shutdown complete. Exiting.');
    process.exit(err ? 1 : 0);
  });

  // Force kill if graceful shutdown takes longer than 15 seconds
  setTimeout(() => {
    logger.error('[SHUTDOWN] Graceful shutdown timed out after 15s. Forcing exit.');
    process.exit(1);
  }, 15000).unref();
}

// Handle POSIX signals (SIGTERM from PM2/Docker, SIGINT from Ctrl+C)
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions & unhandled rejections — log then shut down safely
process.on('uncaughtException', err => {
  logger.error('[FATAL] Uncaught Exception', { error: err.message, stack: err.stack });
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', reason => {
  logger.error('[FATAL] Unhandled Promise Rejection', {
    reason: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined
  });
  gracefulShutdown('unhandledRejection');
});

module.exports = app;

