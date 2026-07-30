/**
 * utils/logger.js
 * Structured application logger for production-ready logging.
 * Writes structured JSON logs in production and human-readable logs in development.
 */

const LOG_LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };

const env = process.env.NODE_ENV || 'development';
const isProd = env === 'production';
const currentLevel =
  LOG_LEVELS[process.env.LOG_LEVEL] ?? (isProd ? LOG_LEVELS.info : LOG_LEVELS.debug);

function formatMessage(level, message, meta = {}) {
  const timestamp = new Date().toISOString();
  if (isProd) {
    return JSON.stringify({ timestamp, level, message, ...meta });
  }
  const metaStr = Object.keys(meta).length ? ' ' + JSON.stringify(meta) : '';
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;
}

function log(level, message, meta) {
  if (LOG_LEVELS[level] > currentLevel) return;
  const output = formatMessage(level, message, meta);
  if (level === 'error') {
    process.stderr.write(output + '\n');
  } else {
    process.stdout.write(output + '\n');
  }
}

const logger = {
  error: (message, meta) => log('error', message, meta),
  warn: (message, meta) => log('warn', message, meta),
  info: (message, meta) => log('info', message, meta),
  debug: (message, meta) => log('debug', message, meta),

  // Express-compatible HTTP request logger middleware
  httpMiddleware: (req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
      log(level, 'HTTP Request', {
        method: req.method,
        url: req.originalUrl,
        status: res.statusCode,
        duration_ms: duration,
        ip: req.ip || req.connection?.remoteAddress
      });
    });
    next();
  }
};

module.exports = logger;
