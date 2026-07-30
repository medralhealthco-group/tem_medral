'use strict';
require('dotenv').config({ quiet: true });
const mysql = require('mysql2/promise');

(async () => {
  const c = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  await c.query(
    `DELETE FROM product_images WHERE product_id IN (
      SELECT id FROM (SELECT id FROM products WHERE slug LIKE 'qa-%' OR title LIKE 'QA %') t
    )`
  );
  await c.query(
    `DELETE FROM cart_items WHERE product_id IN (
      SELECT id FROM (SELECT id FROM products WHERE slug LIKE 'qa-%' OR title LIKE 'QA %') t
    )`
  );
  await c.query(
    `DELETE FROM order_items WHERE product_id IN (
      SELECT id FROM (SELECT id FROM products WHERE slug LIKE 'qa-%' OR title LIKE 'QA %') t
    )`
  );
  await c.query(`DELETE FROM products WHERE slug LIKE 'qa-%' OR title LIKE 'QA %'`);
  await c.query(`DELETE FROM categories WHERE slug LIKE 'qa-%' OR name LIKE 'QA %'`);
  console.log('QA catalog leftovers cleaned');
  await c.end();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
