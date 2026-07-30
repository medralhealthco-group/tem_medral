const { pool } = require("../config/database");

class UserModel {
  // Customer queries
  static async findUserByEmail(email) {
    const [rows] = await pool.query("SELECT * FROM users WHERE email = ? LIMIT 1", [email]);
    return rows[0] || null;
  }

  static async findUserById(id) {
    const [rows] = await pool.query("SELECT id, email, first_name, last_name, phone, role, is_active, created_at FROM users WHERE id = ? LIMIT 1", [id]);
    return rows[0] || null;
  }

  static async createUser({ email, passwordHash, firstName, lastName, phone }) {
    const [result] = await pool.query(
      "INSERT INTO users (email, password_hash, first_name, last_name, phone) VALUES (?, ?, ?, ?, ?)",
      [email, passwordHash, firstName, lastName, phone || null]
    );
    return result.insertId;
  }

  static async updateUserProfile(id, { firstName, lastName, phone }) {
    await pool.query(
      "UPDATE users SET first_name = ?, last_name = ?, phone = ? WHERE id = ?",
      [firstName, lastName, phone || null, id]
    );
  }

  static async updateUserPassword(id, passwordHash) {
    await pool.query(
      "UPDATE users SET password_hash = ? WHERE id = ?",
      [passwordHash, id]
    );
  }

  // Admin user queries
  static async findAdminByEmail(email) {
    const [rows] = await pool.query("SELECT * FROM admin_users WHERE email = ? LIMIT 1", [email]);
    return rows[0] || null;
  }

  static async findAdminById(id) {
    const [rows] = await pool.query("SELECT * FROM admin_users WHERE id = ? LIMIT 1", [id]);
    return rows[0] || null;
  }

  static async updateAdminPassword(id, passwordHash) {
    await pool.query("UPDATE admin_users SET password_hash = ? WHERE id = ?", [passwordHash, id]);
  }

  static async updateAdminLastLogin(id) {
    await pool.query("UPDATE admin_users SET last_login = NOW() WHERE id = ?", [id]);
  }

  static async countCustomers() {
    const [rows] = await pool.query("SELECT COUNT(*) AS total FROM users");
    return rows[0] ? parseInt(rows[0].total, 10) : 0;
  }
}

module.exports = UserModel;
