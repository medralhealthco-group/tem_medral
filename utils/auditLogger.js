/**
 * utils/auditLogger.js
 * Administrative Action Audit Logging Utility.
 * Logs security and operational administrative events to logger & system audit stream.
 */

const logger = require('./logger');

class AuditLogger {
  /**
   * Log an administrative action event
   * @param {Object} options
   * @param {number|string} options.adminId - ID of admin executing action
   * @param {string} options.adminEmail - Email of admin executing action
   * @param {string} options.action - Action identifier (e.g. 'ADMIN_LOGIN_SUCCESS', 'PRODUCT_DELETE')
   * @param {string} options.ip - IP address of the admin
   * @param {Object} [options.details] - Additional contextual details
   */
  static log({ adminId, adminEmail, action, ip, details = {} }) {
    const timestamp = new Date().toISOString();
    const auditRecord = {
      timestamp,
      adminId: adminId || 'system',
      adminEmail: adminEmail || 'unknown',
      action,
      ip: ip || '127.0.0.1',
      details
    };

    logger.info(`[AUDIT LOG] ${action} executed by ${adminEmail} (IP: ${ip})`, auditRecord);
    return auditRecord;
  }

  /**
   * Log failed administrative login attempts
   */
  static logFailedLogin({ email, ip, reason }) {
    logger.warn(`[AUDIT SECURITY] Failed admin login attempt for ${email} from IP ${ip}`, {
      timestamp: new Date().toISOString(),
      email,
      ip,
      reason: reason || 'Invalid credentials'
    });
  }

  /**
   * Log customer authentication / recovery events
   */
  static logAuth({ userId, email, action, ip, details = {} }) {
    const timestamp = new Date().toISOString();
    const auditRecord = {
      timestamp,
      userId: userId || null,
      email: email || 'unknown',
      action,
      ip: ip || '127.0.0.1',
      details
    };

    logger.info(`[AUDIT AUTH] ${action} for ${email || 'unknown'} (IP: ${ip || 'n/a'})`, auditRecord);
    return auditRecord;
  }
}

module.exports = AuditLogger;
