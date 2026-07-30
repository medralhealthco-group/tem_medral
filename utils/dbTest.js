const { pool, testConnection } = require('../config/database');

async function runTest() {
  console.log('Testing Hostinger MySQL Database Connection...');
  const isConnected = await testConnection();
  if (isConnected) {
    try {
      const [rows] = await pool.query('SHOW TABLES;');
      console.log('Database Tables Count:', rows.length);
      console.log('Tables List:', rows);
    } catch (err) {
      console.error('Error executing query:', err.message);
    }
  }
  process.exit(isConnected ? 0 : 1);
}

runTest();
