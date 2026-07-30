/**
 * One-off local seed: schema.sql + seed-catalog.sql using .env DB_* settings.
 * Usage: node scripts/seed-local.js
 */
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function main() {
  const host = process.env.DB_HOST || 'localhost';
  const port = parseInt(process.env.DB_PORT || '3306', 10);
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '';
  const database = process.env.DB_NAME || 'medralhealth';

  console.log('NODE_ENV=', process.env.NODE_ENV);
  console.log('Target DB=', database, '@', `${host}:${port}`, 'as', user);

  const rootConn = await mysql.createConnection({
    host,
    port,
    user,
    password,
    multipleStatements: true
  });

  await rootConn.query(
    `CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  console.log('Database ensured:', database);
  await rootConn.end();

  const conn = await mysql.createConnection({
    host,
    port,
    user,
    password,
    database,
    multipleStatements: true
  });

  const files = process.argv.includes('--catalog-only')
    ? ['seed-catalog.sql']
    : ['schema.sql', 'seed-catalog.sql'];
  for (const file of files) {
    const full = path.join(__dirname, '..', 'database', file);
    const sql = fs.readFileSync(full, 'utf8');
    console.log('Importing', path.relative(process.cwd(), full), '...');
    await conn.query(sql);
    console.log('OK:', file);
  }

  const [cats] = await conn.query(
    'SELECT id, name, slug, is_active FROM categories ORDER BY display_order, id'
  );
  const [prods] = await conn.query(`
    SELECT p.id, p.title, p.slug, p.sku, p.status, c.slug AS category_slug
    FROM products p
    JOIN categories c ON c.id = p.category_id
    ORDER BY p.id
  `);
  const [imgs] = await conn.query(
    'SELECT COUNT(*) AS n FROM product_images WHERE is_primary = 1'
  );

  console.log('\nCategories:', cats.length);
  cats.forEach((r) => console.log(' -', r.slug, `(${r.name})`, `active=${r.is_active}`));
  console.log('Products:', prods.length);
  prods.forEach((r) =>
    console.log(' -', r.slug, '->', r.category_slug, `[${r.status}]`)
  );
  console.log('Primary images:', imgs[0].n);

  await conn.end();
  console.log('\nLocal seed complete.');
}

main().catch((err) => {
  console.error('SEED FAILED:', err.message);
  process.exit(1);
});
