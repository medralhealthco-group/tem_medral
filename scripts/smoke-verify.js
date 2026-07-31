'use strict';

/**
 * Post-change smoke: routes, APIs, checkout validation, DB.
 * Run: node scripts/smoke-verify.js
 */

require('dotenv').config({ quiet: true });
process.env.SHOW_COMING_SOON = 'false';

const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../server');
const { pool, testConnection } = require('../config/database');
const { validateCheckoutFields } = require('../utils/checkoutValidation');

const results = [];

function pass(name, detail) {
  results.push({ name, ok: true, detail: detail || '' });
  console.log(`PASS  ${name}${detail ? ' — ' + detail : ''}`);
}

function fail(name, detail) {
  results.push({ name, ok: false, detail: String(detail || '') });
  console.error(`FAIL  ${name} — ${detail}`);
}

function extractCsrf(html) {
  const m =
    html.match(/name=["']_csrf["']\s+value=["']([^"']+)["']/) ||
    html.match(/content=["']([^"']+)["']\s+name=["']csrf-token["']/) ||
    html.match(/name=["']csrf-token["']\s+content=["']([^"']+)["']/);
  return m ? m[1] : null;
}

async function main() {
  console.log('\n=== 1. Database ===');
  try {
    await testConnection();
    const [rows] = await pool.query('SELECT 1 AS ok, DATABASE() AS db');
    const [tables] = await pool.query(
      "SELECT COUNT(*) AS n FROM information_schema.tables WHERE table_schema = DATABASE()"
    );
    const [products] = await pool.query(
      "SELECT id, slug, title, status FROM products WHERE status = 'published' LIMIT 3"
    );
    pass('DB ping', `database=${rows[0].db}, tables=${tables[0].n}, published_products=${products.length}`);
    if (!products.length) {
      fail('Published products', 'Need at least one published product for cart/checkout smoke');
    }
    var sampleProduct = products[0] || null;
  } catch (e) {
    fail('DB ping', e.message);
    sampleProduct = null;
  }

  console.log('\n=== 2. Public GET routes ===');
  const getRoutes = [
    ['/', 200],
    ['/health', [200, 503]],
    ['/shop', 200],
    ['/cart', 200],
    ['/checkout', [200, 302]], // empty cart redirects to /cart
    ['/account/login', 200],
    ['/pages/contact', 200],
    ['/pages/faqs', 200],
    ['/pages/about-us', 200],
    ['/robots.txt', 200],
    ['/sitemap.xml', 200],
    ['/assets/css/storefront.bundle.css', 200],
    ['/assets/js/checkout.js', 200]
  ];

  for (const [path, expect] of getRoutes) {
    try {
      const res = await request(app).get(path);
      const ok = Array.isArray(expect) ? expect.includes(res.status) : res.status === expect;
      if (ok) pass(`GET ${path}`, `status=${res.status}`);
      else fail(`GET ${path}`, `expected ${expect}, got ${res.status}`);
    } catch (e) {
      fail(`GET ${path}`, e.message);
    }
  }

  console.log('\n=== 3. Health body + shop search API ===');
  try {
    const health = await request(app).get('/health');
    pass('GET /health body', JSON.stringify(health.body));
  } catch (e) {
    fail('GET /health body', e.message);
  }
  try {
    const search = await request(app).get('/shop/api/search').query({ q: 'collagen' });
    const ok = [200, 204].includes(search.status) || (search.status === 200 && search.body);
    if (search.status === 200) pass('GET /shop/api/search', `status=200 keys=${Object.keys(search.body || {}).join(',')}`);
    else fail('GET /shop/api/search', `status=${search.status}`);
  } catch (e) {
    fail('GET /shop/api/search', e.message);
  }

  console.log('\n=== 4. Checkout validator (unit) ===');
  const junk = validateCheckoutFields({
    name: 'PRince',
    email: 'a@b.com',
    phone: '933661771717',
    address: 'anything',
    city: 'd',
    state: 'd',
    pincode: 'dfsdf',
    payment_method: 'cod'
  });
  if (!junk.ok && junk.errors.phone && junk.errors.pincode) {
    pass('Reject junk shipping', Object.keys(junk.errors).join(', '));
  } else {
    fail('Reject junk shipping', JSON.stringify(junk));
  }

  const good = validateCheckoutFields({
    name: 'Prince Sharma',
    email: 'prince@example.com',
    phone: '+91 98765 43210',
    address: 'Flat 12, Spaze Platinum Tower',
    city: 'Gurugram',
    state: 'Haryana',
    pincode: '122018',
    payment_method: 'cod'
  });
  if (good.ok && good.data.phone === '9876543210') {
    pass('Accept valid shipping', `phone normalized=${good.data.phone}`);
  } else {
    fail('Accept valid shipping', JSON.stringify(good));
  }

  console.log('\n=== 5. Cart API + checkout HTTP ===');
  if (!sampleProduct) {
    fail('Cart/checkout HTTP', 'skipped — no published product');
  } else {
    const agent = request.agent(app);
    try {
      const home = await agent.get('/');
      assert.equal(home.status, 200);
      let csrf = extractCsrf(home.text);

      const cartPage = await agent.get('/cart');
      csrf = extractCsrf(cartPage.text) || csrf;
      assert.ok(csrf, 'CSRF token missing');

      const add = await agent
        .post('/cart/add')
        .type('form')
        .send({ _csrf: csrf, productId: sampleProduct.id, quantity: 1 });
      const addOk = [200, 302].includes(add.status) || (add.body && add.body.success);
      if (!addOk && add.status >= 400) {
        fail('POST /cart/add', `status=${add.status} body=${JSON.stringify(add.body || {}).slice(0, 200)}`);
      } else {
        pass('POST /cart/add', `status=${add.status} productId=${sampleProduct.id}`);
      }

      const cartApi = await agent.get('/cart/api');
      if (cartApi.status === 200) {
        const count = cartApi.body?.itemCount ?? cartApi.body?.items?.length ?? '?';
        pass('GET /cart/api', `status=200 itemCount=${count}`);
      } else {
        fail('GET /cart/api', `status=${cartApi.status}`);
      }

      const checkoutGet = await agent.get('/checkout');
      if (checkoutGet.status !== 200) {
        fail('GET /checkout (with cart)', `status=${checkoutGet.status}`);
      } else {
        pass('GET /checkout (with cart)', 'status=200');
        csrf = extractCsrf(checkoutGet.text) || csrf;
        assert.ok(checkoutGet.text.includes('checkout.js'), 'checkout.js not linked');
        pass('Checkout page loads checkout.js', 'script present');
      }

      const junkPost = await agent
        .post('/checkout')
        .type('form')
        .send({
          _csrf: csrf,
          name: 'PRince',
          email: 'junk@example.com',
          phone: '933661771717',
          address: 'anything',
          city: 'd',
          state: 'd',
          pincode: 'dfsdf',
          payment_method: 'cod'
        });
      if (junkPost.status === 400 && /valid|PIN|mobile|city|address/i.test(junkPost.text)) {
        pass('POST /checkout rejects junk', `status=400`);
      } else if (junkPost.status === 302 && String(junkPost.headers.location || '').includes('/checkout/success')) {
        fail('POST /checkout rejects junk', 'accepted junk and redirected to success');
      } else {
        fail(
          'POST /checkout rejects junk',
          `status=${junkPost.status} loc=${junkPost.headers.location || ''} snippet=${junkPost.text.slice(0, 120)}`
        );
      }

      // Refresh CSRF after failed post
      const checkoutAgain = await agent.get('/checkout');
      csrf = extractCsrf(checkoutAgain.text) || csrf;

      const validPost = await agent
        .post('/checkout')
        .type('form')
        .send({
          _csrf: csrf,
          name: 'Prince Sharma',
          email: 'smoke.verify@example.com',
          phone: '9876543210',
          address: 'Flat 12, Spaze Platinum Tower',
          city: 'Gurugram',
          state: 'Haryana',
          pincode: '122018',
          payment_method: 'cod'
        });

      const loc = String(validPost.headers.location || '');
      if (validPost.status === 302 && loc.includes('/checkout/success/')) {
        const orderNumber = loc.split('/checkout/success/')[1];
        pass('POST /checkout accepts valid', `redirect ${loc}`);

        const [orderRows] = await pool.query(
          'SELECT order_number, shipping_phone, shipping_pincode, shipping_city, order_status FROM orders WHERE order_number = ? LIMIT 1',
          [orderNumber]
        );
        if (orderRows.length === 1) {
          const o = orderRows[0];
          if (o.shipping_phone === '9876543210' && o.shipping_pincode === '122018' && o.shipping_city === 'Gurugram') {
            pass('Order persisted in DB', `${o.order_number} status=${o.order_status}`);
          } else {
            fail('Order persisted in DB', JSON.stringify(o));
          }
        } else {
          fail('Order persisted in DB', `order ${orderNumber} not found`);
        }

        const successPage = await agent.get(loc);
        if (successPage.status === 200) pass('GET checkout success', `status=200`);
        else fail('GET checkout success', `status=${successPage.status}`);
      } else {
        fail(
          'POST /checkout accepts valid',
          `status=${validPost.status} loc=${loc} hasError=${/alert-danger|form-error|is-invalid/i.test(validPost.text)}`
        );
      }
    } catch (e) {
      fail('Cart/checkout HTTP', e.stack || e.message);
    }
  }

  console.log('\n=== 6. Auth-gated routes (expect redirect) ===');
  for (const path of ['/account/dashboard', '/account/orders', '/account/profile', '/admin/dashboard']) {
    try {
      const res = await request(app).get(path);
      const ok = [301, 302, 303, 401, 403].includes(res.status);
      if (ok) pass(`GET ${path} (unauth)`, `status=${res.status} → ${res.headers.location || ''}`);
      else fail(`GET ${path} (unauth)`, `expected redirect/deny, got ${res.status}`);
    } catch (e) {
      fail(`GET ${path}`, e.message);
    }
  }

  const failed = results.filter((r) => !r.ok);
  console.log('\n=== Summary ===');
  console.log(`Total: ${results.length}  Pass: ${results.length - failed.length}  Fail: ${failed.length}`);
  if (failed.length) {
    failed.forEach((f) => console.log(` - ${f.name}: ${f.detail}`));
  }

  await pool.end().catch(() => {});
  process.exit(failed.length ? 1 : 0);
}

main().catch(async (e) => {
  console.error(e);
  await pool.end().catch(() => {});
  process.exit(1);
});
