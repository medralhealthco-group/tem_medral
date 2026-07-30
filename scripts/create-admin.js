/**
 * Securely create (or reset) an administrator account.
 *
 * Usage:
 *   npm run create-admin -- --email admin@example.com --name "Admin Name" --password "YourStrongPass1!"
 *
 * Password rules match AuthService: min 8 chars, at least one letter and one number/symbol.
 */

require('dotenv').config();
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token.startsWith('--')) {
      const key = token.slice(2);
      const value = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
      args[key] = value;
    }
  }
  return args;
}

function validatePassword(password) {
  if (!password || password.length < 8) {
    throw new Error('Password must be at least 8 characters long.');
  }
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumberOrSymbol = /[0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password);
  if (!hasLetter || !hasNumberOrSymbol) {
    throw new Error('Password must contain at least one letter and one number or special character.');
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const email = args.email && String(args.email).toLowerCase().trim();
  const fullName = args.name && String(args.name).trim();
  const password = args.password && String(args.password);

  if (!email || !fullName || !password) {
    console.error(
      'Usage: npm run create-admin -- --email admin@example.com --name "Admin Name" --password "YourStrongPass1!"'
    );
    process.exit(1);
  }

  validatePassword(password);

  const required = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER'];
  for (const key of required) {
    if (!process.env[key]) {
      console.error(`Missing required environment variable: ${key}`);
      process.exit(1);
    }
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME
  });

  try {
    const [existing] = await connection.query(
      'SELECT id FROM admin_users WHERE email = ? LIMIT 1',
      [email]
    );

    if (existing[0]) {
      await connection.query(
        'UPDATE admin_users SET password_hash = ?, full_name = ?, role = ?, is_active = 1 WHERE id = ?',
        [passwordHash, fullName, 'superadmin', existing[0].id]
      );
      console.log(`Updated administrator account: ${email}`);
    } else {
      await connection.query(
        'INSERT INTO admin_users (email, password_hash, full_name, role, is_active) VALUES (?, ?, ?, ?, 1)',
        [email, passwordHash, fullName, 'superadmin']
      );
      console.log(`Created administrator account: ${email}`);
    }

    console.log('Store the password in your password manager. It is not printed again.');
  } finally {
    await connection.end();
  }
}

main().catch(err => {
  console.error('[create-admin] Failed:', err.message);
  process.exit(1);
});
