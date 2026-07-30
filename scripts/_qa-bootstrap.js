'use strict';

require('dotenv').config({ quiet: true });
const mysql = require('mysql2/promise');

(async () => {
  console.log('SHOW_COMING_SOON=' + process.env.SHOW_COMING_SOON);
  console.log('NODE_ENV=' + process.env.NODE_ENV);
  console.log('PORT=' + (process.env.PORT || 3000));
  console.log('SMTP_HOST_SET=' + Boolean(process.env.SMTP_HOST));

  const c = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  const [[p]] = await c.query(
    "SELECT COUNT(*) AS n FROM products WHERE status = 'published'"
  );
  const [[a]] = await c.query('SELECT COUNT(*) AS n FROM admin_users');
  const [[u]] = await c.query('SELECT COUNT(*) AS n FROM users');
  const [prod] = await c.query(
    "SELECT id, slug, title, stock_quantity, price FROM products WHERE status = 'published' LIMIT 5"
  );
  const [cats] = await c.query(
    'SELECT id, slug, name FROM categories WHERE is_active = 1 LIMIT 5'
  );
  const [admins] = await c.query('SELECT id, email FROM admin_users LIMIT 3');

  console.log(JSON.stringify({
    published_products: p.n,
    admins: a.n,
    users: u.n,
    sample_products: prod,
    sample_cats: cats,
    admin_emails: admins.map((x) => x.email)
  }, null, 2));

  await c.end();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
