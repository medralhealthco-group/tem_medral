/**
 * utils/envValidator.js
 * Validates required environment variables at startup.
 * Prevents the server from starting with missing or unsafe production config.
 */

const logger = require('./logger');

/** Required variables for all environments */
const REQUIRED_VARS = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD', 'SESSION_SECRET'];

/** Variables that must NOT use their default fallback values in production */
const PRODUCTION_STRICT_VARS = [
  {
    key: 'SESSION_SECRET',
    unsafe: [
      'medral_health_secret_key_session_2026_super_secure',
      'medral_health_session_secret',
      'secret'
    ]
  },
  { key: 'DB_PASSWORD', unsafe: ['your_database_password_here', 'password', 'root', ''] }
];

function validateEnv() {
  const env = process.env.NODE_ENV || 'development';
  const errors = [];
  const warnings = [];

  // Check required variables exist
  for (const key of REQUIRED_VARS) {
    // Allow empty DB_PASSWORD in non-production environments (e.g. local XAMPP/MySQL)
    if (key === 'DB_PASSWORD' && env !== 'production') {
      if (process.env[key] === undefined) {
        errors.push(`Missing environment variable: ${key}`);
      }
      continue;
    }

    if (!process.env[key] || process.env[key].trim() === '') {
      errors.push(`Missing required environment variable: ${key}`);
    }
  }

  // In production, check for unsafe default values
  if (env === 'production') {
    for (const { key, unsafe } of PRODUCTION_STRICT_VARS) {
      const value = process.env[key];
      if (value && unsafe.includes(value)) {
        errors.push(
          `[SECURITY] Environment variable ${key} is set to an insecure default in production`
        );
      }
    }

    if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length < 32) {
      errors.push('[SECURITY] SESSION_SECRET must be at least 32 characters long in production');
    }
  }

  // Warn about optional but recommended variables
  if (!process.env.PORT) {
    warnings.push('PORT not set — defaulting to 3000');
  }
  if (!process.env.ASSET_VERSION) {
    warnings.push('ASSET_VERSION not set — defaulting to 1.0.0');
  }
  if (!process.env.LOG_LEVEL) {
    warnings.push("LOG_LEVEL not set — defaulting to 'info' in production, 'debug' in development");
  }
  if (!process.env.SMTP_HOST || !process.env.SMTP_FROM) {
    warnings.push(
      'SMTP_HOST/SMTP_FROM not set — contact form submissions will be saved to the database without email notification'
    );
  }

  // Log warnings
  for (const warning of warnings) {
    logger.warn(`[ENV] ${warning}`);
  }

  // Abort on errors
  if (errors.length > 0) {
    for (const error of errors) {
      logger.error(`[ENV VALIDATION FAILED] ${error}`);
    }
    logger.error('[ENV] Server startup aborted due to environment configuration errors.');
    process.exit(1);
  }

  logger.info('[ENV] Environment validation passed', { NODE_ENV: env });
}

module.exports = { validateEnv };
