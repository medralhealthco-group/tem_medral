const crypto = require('crypto');
const { pool } = require('../config/database');

const TOKEN_BYTES = 32;
const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

class PasswordResetModel {
  static hashToken(rawToken) {
    return crypto.createHash('sha256').update(String(rawToken), 'utf8').digest('hex');
  }

  static generateRawToken() {
    return crypto.randomBytes(TOKEN_BYTES).toString('hex');
  }

  static getExpiryDate(from = new Date()) {
    return new Date(from.getTime() + TOKEN_TTL_MS);
  }

  /** Invalidate outstanding unused tokens for a user (single active reset). */
  static async invalidateActiveTokensForUser(userId) {
    await pool.query(
      `UPDATE password_reset_tokens
       SET used_at = COALESCE(used_at, NOW())
       WHERE user_id = ? AND used_at IS NULL`,
      [userId]
    );
  }

  static async createToken({ userId, tokenHash, expiresAt, requestIp }) {
    const [result] = await pool.query(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at, request_ip)
       VALUES (?, ?, ?, ?)`,
      [userId, tokenHash, expiresAt, requestIp || null]
    );
    return result.insertId;
  }

  static async findValidByTokenHash(tokenHash) {
    const [rows] = await pool.query(
      `SELECT t.*, u.email, u.first_name, u.last_name, u.is_active
       FROM password_reset_tokens t
       INNER JOIN users u ON u.id = t.user_id
       WHERE t.token_hash = ?
         AND t.used_at IS NULL
         AND t.expires_at > NOW()
         AND u.is_active = 1
       LIMIT 1`,
      [tokenHash]
    );
    return rows[0] || null;
  }

  static async markUsed(tokenId) {
    await pool.query(
      `UPDATE password_reset_tokens SET used_at = NOW() WHERE id = ? AND used_at IS NULL`,
      [tokenId]
    );
  }

  static async purgeExpired(olderThanDays = 7) {
    await pool.query(
      `DELETE FROM password_reset_tokens
       WHERE expires_at < (NOW() - INTERVAL ? DAY)
          OR (used_at IS NOT NULL AND used_at < (NOW() - INTERVAL ? DAY))`,
      [olderThanDays, olderThanDays]
    );
  }
}

PasswordResetModel.TOKEN_TTL_MS = TOKEN_TTL_MS;

module.exports = PasswordResetModel;
