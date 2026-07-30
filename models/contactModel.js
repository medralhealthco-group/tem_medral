const { pool } = require('../config/database');

class ContactModel {
  static async createSubmission(payload) {
    const [result] = await pool.query(
      `INSERT INTO contact_submissions
        (name, email, phone, company, service, product_category, quantity, message, newsletter, source, ip_address, user_agent, email_sent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        payload.name,
        payload.email,
        payload.phone || null,
        payload.company || null,
        payload.service || null,
        payload.productCategory || null,
        payload.quantity || null,
        payload.message || null,
        payload.newsletter ? 1 : 0,
        payload.source || 'contact_page',
        payload.ipAddress || null,
        payload.userAgent || null,
        payload.emailSent ? 1 : 0
      ]
    );
    return result.insertId;
  }

  static async markEmailSent(id, sent = true) {
    await pool.query('UPDATE contact_submissions SET email_sent = ? WHERE id = ?', [sent ? 1 : 0, id]);
  }
}

module.exports = ContactModel;
