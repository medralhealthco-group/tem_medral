const mysql = require('mysql2/promise');
require('dotenv').config();

// Create MySQL connection pool using environment variables
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'medralhealth',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

/**
 * Utility helper to test database connectivity.
 * Logs status to console without breaking application startup.
 */
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log(
      `[DATABASE] Successfully connected to MySQL database: ${process.env.DB_NAME || 'medralhealth'}`
    );
    connection.release();
    return true;
  } catch (error) {
    console.warn(
      `[DATABASE WARNING] Could not connect to MySQL database (${error.message}). Please ensure DB_USER, DB_PASSWORD, and DB_NAME are set in .env.`
    );
    return false;
  }
}

module.exports = {
  pool,
  testConnection
};
