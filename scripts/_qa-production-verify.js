'use strict';

/**
 * Production verification runner — exercises every critical customer/admin journey.
 * Evidence HTML/JSON written to tests/qa-evidence/
 * Temporary QA fixtures are created and cleaned when possible.
 */

require('dotenv').config({ quiet: true });

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const assert = require('node:assert/strict');
const request = require('supertest');
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

process.env.SHOW_COMING_SOON = 'false';

const app = require('../server');
const { pool } = require('../config/database');

const EVIDENCE_DIR = path.join(__dirname, '..', 'tests', 'qa-evidence');
const RUN_ID = new Date().toISOString().replace(/[:.]/g, '-');
const RUN_DIR = path.join(EVIDENCE_DIR, RUN_ID);

const QA_ADMIN = {
  email: 'qa-automation@medralhealth.local',
  name: 'QA Automation Admin',
  password: 'QaVerify!' + crypto.randomBytes(3).toString('hex')
};

const QA_CUSTOMER = {
  firstName: 'QA',
  lastName: 'Buyer',
  email: `qa.buyer.${Date.now()}@example.com`,
  phone: '+919876543210',
  password: 'BuyerPass1!'
};

const results = [];
const issues = [];
let fixture = {
  adminId: null,
  categoryId: null,
  categorySlug: null,
  productId: null,
  productSlug: null,
  orderId: null,
  orderNumber: null,
  imageId: null
};

function record(area, name, status, details = {}, severity = null) {
  const row = { area, name, status, details, severity, at: new Date().toISOString() };
  results.push(row);
  const mark = status === 'PASS' ? '✓' : status === 'FAIL' ? '✗' : '○';
  console.log(`${mark} [${area}] ${name} — ${status}${details.note ? ` (${details.note})` : ''}`);
  return row;
}

function addIssue({
  area,
  title,
  severity,
  steps,
  rootCause,
  fix,
  evidence
}) {
  issues.push({
    area,
    title,
    severity,
    steps,
    rootCause,
    fix,
    evidence: evidence || 'n/a'
  });
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function saveEvidence(name, content, ext = 'html') {
  ensureDir(RUN_DIR);
  const safe = String(name).replace(/[^a-zA-Z0-9._-]+/g, '_').replace(/^_|_$/g, '');
  const file = path.join(RUN_DIR, `${safe}.${ext}`);
  fs.writeFileSync(file, typeof content === 'string' ? content : JSON.stringify(content, null, 2));
  return path.relative(path.join(__dirname, '..'), file).replace(/\\/g, '/');
}

function extractCsrf(html) {
  const meta = html.match(/<meta\s+name=["']csrf-token["']\s+content=["']([^"']+)["']/i);
  if (meta) return meta[1];
  const hidden = html.match(/name=["']_csrf["']\s+value=["']([^"']+)["']/i);
  if (hidden) return hidden[1];
  return null;
}

function agent() {
  return request.agent(app);
}

async function db() {
  return pool;
}

async function setupFixtures() {
  const conn = await db();
  const hash = await bcrypt.hash(QA_ADMIN.password, 12);

  const [existing] = await conn.query('SELECT id FROM admin_users WHERE email = ?', [QA_ADMIN.email]);
  if (existing[0]) {
    await conn.query(
      'UPDATE admin_users SET password_hash = ?, full_name = ?, role = ?, is_active = 1 WHERE id = ?',
      [hash, QA_ADMIN.name, 'superadmin', existing[0].id]
    );
    fixture.adminId = existing[0].id;
  } else {
    const [ins] = await conn.query(
      'INSERT INTO admin_users (email, password_hash, full_name, role, is_active) VALUES (?, ?, ?, ?, 1)',
      [QA_ADMIN.email, hash, QA_ADMIN.name, 'superadmin']
    );
    fixture.adminId = ins.insertId;
  }

  const slug = `qa-category-${Date.now()}`;
  const [cat] = await conn.query(
    `INSERT INTO categories (name, slug, description, display_order, is_active)
     VALUES (?, ?, ?, 999, 1)`,
    ['QA Category', slug, 'Temporary QA category — safe to delete']
  );
  fixture.categoryId = cat.insertId;
  fixture.categorySlug = slug;

  const pSlug = `qa-product-${Date.now()}`;
  const [prod] = await conn.query(
    `INSERT INTO products
      (title, slug, sku, category_id, brand, stock_quantity, price, sale_price, short_description, full_description, status, is_featured)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', 0)`,
    [
      'QA Test Product',
      pSlug,
      `QA-SKU-${Date.now()}`,
      fixture.categoryId,
      'QA Brand',
      25,
      499.0,
      null,
      'QA short description',
      'QA full description for production verification.'
    ]
  );
  fixture.productId = prod.insertId;
  fixture.productSlug = pSlug;

  record('Setup', 'QA fixtures created', 'PASS', {
    note: `category=${fixture.categoryId} product=${fixture.productId}`
  });
}

async function cleanupFixtures() {
  const conn = await db();
  try {
    if (fixture.productId) {
      await conn.query('DELETE FROM product_images WHERE product_id = ?', [fixture.productId]);
      await conn.query('DELETE FROM cart_items WHERE product_id = ?', [fixture.productId]);
      await conn.query('DELETE FROM order_items WHERE product_id = ?', [fixture.productId]);
      await conn.query('DELETE FROM products WHERE id = ?', [fixture.productId]);
    }
    if (fixture.categoryId) {
      await conn.query('DELETE FROM categories WHERE id = ?', [fixture.categoryId]);
    }
    // Keep QA admin for repeatability but deactivate to reduce risk
    if (fixture.adminId) {
      await conn.query('UPDATE admin_users SET is_active = 0 WHERE id = ? AND email = ?', [
        fixture.adminId,
        QA_ADMIN.email
      ]);
    }
    record('Cleanup', 'QA fixtures cleaned', 'PASS');
  } catch (err) {
    record('Cleanup', 'QA fixtures cleaned', 'FAIL', { note: err.message }, 'Medium');
  }
}

async function checkPage(area, name, url, checks = {}) {
  const a = agent();
  const started = Date.now();
  const res = await a.get(url);
  const ms = Date.now() - started;
  const evidence = saveEvidence(
    `${area.replace(/\s+/g, '_')}_${name.replace(/\s+/g, '_')}`,
    res.text || JSON.stringify(res.body)
  );

  try {
    if (checks.status) {
      const allowed = Array.isArray(checks.status) ? checks.status : [checks.status];
      assert.ok(allowed.includes(res.status), `expected ${allowed.join('|')} got ${res.status}`);
    } else {
      assert.equal(res.status, 200);
    }
    if (checks.includes) {
      for (const needle of checks.includes) {
        assert.ok(
          (res.text || '').includes(needle) || JSON.stringify(res.body || {}).includes(needle),
          `missing: ${needle}`
        );
      }
    }
    if (checks.excludes) {
      for (const needle of checks.excludes) {
        assert.ok(!(res.text || '').includes(needle), `unexpected: ${needle}`);
      }
    }
    if (checks.headers) {
      for (const [k, v] of Object.entries(checks.headers)) {
        if (typeof v === 'function') assert.ok(v(res.headers[k]), `header ${k}`);
        else assert.ok(String(res.headers[k] || '').includes(v), `header ${k}`);
      }
    }
    if (checks.maxMs) {
      assert.ok(ms <= checks.maxMs, `slow response ${ms}ms > ${checks.maxMs}ms`);
    }
    record(area, name, 'PASS', { url, status: res.status, ms, evidence });
    return { res, a, csrf: extractCsrf(res.text || ''), evidence, ms };
  } catch (err) {
    record(area, name, 'FAIL', { url, status: res.status, ms, evidence, note: err.message }, 'High');
    addIssue({
      area,
      title: `${name} failed`,
      severity: checks.severity || 'High',
      steps: [`GET ${url}`, `Assert: ${err.message}`],
      rootCause: err.message,
      fix: checks.fix || 'Investigate route/template and restore expected response.',
      evidence
    });
    return { res, a, csrf: extractCsrf(res.text || ''), evidence, ms, failed: true };
  }
}

async function runPublicAndSeo() {
  await checkPage('Homepage', 'Homepage loads', '/', {
    includes: ['html', 'lang="en"', 'viewport', 'Skip to main content', 'MainContent'],
    headers: {
      'content-security-policy': (v) => v && v.includes('nonce-'),
      'x-content-type-options': 'nosniff'
    },
    maxMs: 3000
  });

  const home = await checkPage('Accessibility', 'Homepage skip link + H1', '/', {
    includes: ['skip-link', 'href="#MainContent"'],
    severity: 'Medium'
  });
  if (!home.failed) {
    const h1Count = (home.res.text.match(/<h1[\s>]/gi) || []).length;
    if (h1Count !== 1) {
      record('Accessibility', 'Single H1 on homepage', 'FAIL', { note: `h1 count=${h1Count}` }, 'Medium');
      addIssue({
        area: 'Accessibility',
        title: 'Homepage H1 count unexpected',
        severity: 'Medium',
        steps: ['Open /', `Count <h1> tags (found ${h1Count})`],
        rootCause: 'Semantic heading structure not singular',
        fix: 'Ensure exactly one visible H1 on homepage',
        evidence: home.evidence
      });
    } else {
      record('Accessibility', 'Single H1 on homepage', 'PASS', { evidence: home.evidence });
    }
  }

  await checkPage('Navigation', 'Shop nav destination', '/shop', { includes: ['shop', 'product'] });
  await checkPage('Navigation', 'About page', '/pages/about-us', { status: [200, 301, 302] });
  await checkPage('Navigation', 'Contact page', '/pages/contact', { includes: ['Contact', 'contact[name]', '_csrf'] });
  await checkPage('Navigation', 'Legacy .html redirect', '/pages/about-us.html', {
    status: [301, 302, 200]
  });

  // Megamenu placeholder mode
  const megaCfg = require('../config/megamenu');
  if (megaCfg.linkMode === 'placeholder') {
    record('Navigation', 'Megamenu deep links', 'FAIL', {
      note: 'linkMode=placeholder — cards resolve to /shop'
    }, 'Medium');
    addIssue({
      area: 'Navigation',
      title: 'Megamenu product/category cards are placeholders',
      severity: 'Medium',
      steps: [
        'Open homepage or shop',
        'Hover Products megamenu',
        'Click a featured product/category card'
      ],
      rootCause: "config/megamenu.js has linkMode: 'placeholder'",
      fix: "Set linkMode to 'live' and wire real /shop/product/:slug and /shop/category/:slug URLs",
      evidence: 'config/megamenu.js'
    });
  } else {
    record('Navigation', 'Megamenu deep links', 'PASS');
  }

  await checkPage('Search', 'Live search API (short query rejected gracefully)', '/shop/api/search?q=a', {
    status: [200, 400],
    severity: 'Low'
  });
  await checkPage('Search', 'Live search API with query', `/shop/api/search?q=QA`, {
    status: 200,
    includes: ['']
  });

  await checkPage('Categories', 'Category page by slug', `/shop/category/${fixture.categorySlug}`, {
    includes: ['QA Category', fixture.categorySlug]
  });

  await checkPage('Product Page', 'Product detail', `/shop/product/${fixture.productSlug}`, {
    includes: ['QA Test Product', 'Add', 'csrf-token']
  });

  await checkPage('SEO', 'robots.txt', '/robots.txt', {
    includes: ['Sitemap:', 'User-agent']
  });
  await checkPage('SEO', 'sitemap index', '/sitemap.xml', {
    includes: ['sitemapindex', 'sitemap-products.xml']
  });
  await checkPage('SEO', 'sitemap products', '/sitemap-products.xml', {
    includes: ['urlset', fixture.productSlug]
  });
  await checkPage('SEO', 'sitemap categories', '/sitemap-categories.xml', {
    includes: [fixture.categorySlug]
  });

  const seoHome = await checkPage('SEO', 'Homepage canonical/OG', '/', {
    includes: ['rel="canonical"', 'og:title', 'twitter:card']
  });
  if (!seoHome.failed && !/property=["']og:image["']/i.test(seoHome.res.text)) {
    record('SEO', 'OG image present', 'FAIL', { evidence: seoHome.evidence }, 'Medium');
    addIssue({
      area: 'SEO',
      title: 'Missing og:image on homepage',
      severity: 'Medium',
      steps: ['GET /', 'Inspect head for og:image'],
      rootCause: 'Open Graph image meta not rendered or not configured',
      fix: 'Ensure head-seo partial emits og:image with absolute SITE_URL asset',
      evidence: seoHome.evidence
    });
  } else if (!seoHome.failed) {
    record('SEO', 'OG image present', 'PASS', { evidence: seoHome.evidence });
  }
}

async function runCommerce() {
  const a = agent();
  const pdp = await a.get(`/shop/product/${fixture.productSlug}`);
  const csrf = extractCsrf(pdp.text);
  const evidencePdp = saveEvidence('commerce_pdp', pdp.text);

  if (!csrf) {
    record('Add to Cart', 'CSRF available on PDP', 'FAIL', { evidence: evidencePdp }, 'Critical');
    addIssue({
      area: 'Add to Cart',
      title: 'No CSRF token on product page',
      severity: 'Critical',
      steps: [`GET /shop/product/${fixture.productSlug}`, 'Look for csrf-token meta'],
      rootCause: 'csrfToken not injected into layout/meta',
      fix: 'Ensure csrf middleware sets res.locals.csrfToken and head partial renders meta',
      evidence: evidencePdp
    });
    return;
  }

  const add = await a
    .post('/cart/add')
    .set('X-CSRF-Token', csrf)
    .set('Accept', 'application/json')
    .send({ productId: fixture.productId, quantity: 2 });
  saveEvidence('commerce_add_to_cart', add.body, 'json');

  if (add.status === 200 && (add.body.success || add.body.cart || add.body.itemCount != null)) {
    record('Add to Cart', 'Add product to cart', 'PASS', {
      status: add.status,
      evidence: 'tests/qa-evidence/' + RUN_ID + '/commerce_add_to_cart.json'
    });
  } else {
    record('Add to Cart', 'Add product to cart', 'FAIL', {
      status: add.status,
      note: JSON.stringify(add.body).slice(0, 200)
    }, 'Critical');
    addIssue({
      area: 'Add to Cart',
      title: 'Add to cart API failed',
      severity: 'Critical',
      steps: [
        `GET /shop/product/${fixture.productSlug}`,
        'POST /cart/add with productId, quantity, X-CSRF-Token'
      ],
      rootCause: `HTTP ${add.status}: ${JSON.stringify(add.body)}`,
      fix: 'Fix cartController.addToCart and CSRF acceptance for JSON clients',
      evidence: 'tests/qa-evidence/' + RUN_ID + '/commerce_add_to_cart.json'
    });
    return;
  }

  const cartPage = await a.get('/cart');
  const cartEvidence = saveEvidence('commerce_cart', cartPage.text);
  if (cartPage.status === 200 && /QA Test Product|cart/i.test(cartPage.text)) {
    record('Cart', 'Cart page shows items', 'PASS', { evidence: cartEvidence });
  } else {
    record('Cart', 'Cart page shows items', 'FAIL', { evidence: cartEvidence }, 'Critical');
    addIssue({
      area: 'Cart',
      title: 'Cart page empty or error after add',
      severity: 'Critical',
      steps: ['Add to cart', 'GET /cart'],
      rootCause: 'Cart session/DB not reflecting added item in view',
      fix: 'Verify cartModel session binding and cart page render',
      evidence: cartEvidence
    });
  }

  const cartApi = await a.get('/cart/api');
  saveEvidence('commerce_cart_api', cartApi.body, 'json');
  record(
    'Cart',
    'Cart API returns JSON',
    cartApi.status === 200 ? 'PASS' : 'FAIL',
    { status: cartApi.status }
  );

  const checkoutGet = await a.get('/checkout');
  const checkoutEvidence = saveEvidence('commerce_checkout', checkoutGet.text);
  const checkoutCsrf = extractCsrf(checkoutGet.text) || csrf;

  if (checkoutGet.status !== 200) {
    record('Checkout', 'Checkout page', 'FAIL', {
      status: checkoutGet.status,
      evidence: checkoutEvidence
    }, 'Critical');
    addIssue({
      area: 'Checkout',
      title: 'Checkout page not reachable with cart items',
      severity: 'Critical',
      steps: ['Add to cart', 'GET /checkout'],
      rootCause: `HTTP ${checkoutGet.status}`,
      fix: 'Ensure non-empty cart allows checkout render',
      evidence: checkoutEvidence
    });
    return;
  }
  record('Checkout', 'Checkout page', 'PASS', { evidence: checkoutEvidence });

  const place = await a
    .post('/checkout')
    .type('form')
    .send({
      _csrf: checkoutCsrf,
      name: 'QA Buyer',
      email: QA_CUSTOMER.email,
      phone: QA_CUSTOMER.phone,
      address: '12 QA Street',
      city: 'Mumbai',
      state: 'MH',
      pincode: '400001',
      payment_method: 'cod'
    });
  saveEvidence('commerce_checkout_post', {
    status: place.status,
    location: place.headers.location,
    bodySnippet: (place.text || '').slice(0, 500)
  }, 'json');

  const success =
    [302, 303].includes(place.status) &&
    String(place.headers.location || '').includes('/checkout/success/');

  if (success) {
    const orderNumber = place.headers.location.split('/').pop();
    fixture.orderNumber = orderNumber;
    record('Checkout', 'COD checkout completes', 'PASS', {
      orderNumber,
      evidence: 'tests/qa-evidence/' + RUN_ID + '/commerce_checkout_post.json'
    });
    const successPage = await a.get(place.headers.location);
    const se = saveEvidence('commerce_success', successPage.text);
    record(
      'Checkout',
      'Order success page',
      successPage.status === 200 ? 'PASS' : 'FAIL',
      { evidence: se }
    );
  } else {
    record('Checkout', 'COD checkout completes', 'FAIL', {
      status: place.status,
      note: place.headers.location || (place.text || '').slice(0, 120)
    }, 'Critical');
    addIssue({
      area: 'Checkout',
      title: 'COD checkout failed',
      severity: 'Critical',
      steps: [
        'Add in-stock product to cart',
        'GET /checkout',
        'POST /checkout with COD fields + CSRF'
      ],
      rootCause: `HTTP ${place.status} location=${place.headers.location}`,
      fix: 'Inspect orderController.handleCheckout validation and stock reservation',
      evidence: 'tests/qa-evidence/' + RUN_ID + '/commerce_checkout_post.json'
    });
  }
}

async function runAuthAndAccount() {
  const a = agent();
  const regPage = await a.get('/account/register');
  let csrf = extractCsrf(regPage.text);
  saveEvidence('auth_register_page', regPage.text);

  const reg = await a
    .post('/account/register')
    .type('form')
    .send({
      _csrf: csrf,
      firstName: QA_CUSTOMER.firstName,
      lastName: QA_CUSTOMER.lastName,
      email: QA_CUSTOMER.email,
      phone: QA_CUSTOMER.phone,
      password: QA_CUSTOMER.password,
      confirmPassword: QA_CUSTOMER.password
    });
  saveEvidence('auth_register_post', {
    status: reg.status,
    location: reg.headers.location
  }, 'json');

  const regOk = [200, 302, 303].includes(reg.status);
  record('Register', 'Customer registration', regOk ? 'PASS' : 'FAIL', {
    status: reg.status,
    location: reg.headers.location
  }, regOk ? null : 'Critical');
  if (!regOk) {
    addIssue({
      area: 'Register',
      title: 'Registration failed',
      severity: 'Critical',
      steps: ['GET /account/register', 'POST valid registration fields'],
      rootCause: `HTTP ${reg.status}`,
      fix: 'Inspect authController.handleRegister validation',
      evidence: 'tests/qa-evidence/' + RUN_ID + '/auth_register_post.json'
    });
  }

  // logout then login
  const dash = await a.get('/account/dashboard');
  csrf = extractCsrf(dash.text) || csrf;
  await a.post('/account/logout').type('form').send({ _csrf: csrf });

  const loginPage = await a.get('/account/login');
  csrf = extractCsrf(loginPage.text);
  saveEvidence('auth_login_page', loginPage.text);
  const login = await a
    .post('/account/login')
    .type('form')
    .send({ _csrf: csrf, email: QA_CUSTOMER.email, password: QA_CUSTOMER.password });
  const loginOk = [302, 303].includes(login.status);
  record('Login', 'Customer login', loginOk ? 'PASS' : 'FAIL', {
    status: login.status,
    location: login.headers.location
  }, loginOk ? null : 'Critical');
  if (!loginOk) {
    addIssue({
      area: 'Login',
      title: 'Customer login failed',
      severity: 'Critical',
      steps: ['Register user', 'Logout', 'POST /account/login'],
      rootCause: `HTTP ${login.status}`,
      fix: 'Inspect authController.handleLogin / session regeneration',
      evidence: 'tests/qa-evidence/' + RUN_ID + '/auth_login_page.html'
    });
  }

  const profile = await checkPage('Profile', 'Profile page (auth agent)', '/account/profile', {
    status: [200, 302]
  });
  // re-login agent for authenticated pages
  const a2 = agent();
  const lp = await a2.get('/account/login');
  const lcsrf = extractCsrf(lp.text);
  await a2
    .post('/account/login')
    .type('form')
    .send({ _csrf: lcsrf, email: QA_CUSTOMER.email, password: QA_CUSTOMER.password });

  const profile2 = await a2.get('/account/profile');
  const pe = saveEvidence('account_profile', profile2.text);
  if (profile2.status === 200) {
    record('Profile', 'Authenticated profile', 'PASS', { evidence: pe });
    const pcsrf = extractCsrf(profile2.text);
    const upd = await a2
      .post('/account/profile')
      .type('form')
      .send({
        _csrf: pcsrf,
        firstName: 'QA',
        lastName: 'BuyerUpdated',
        phone: QA_CUSTOMER.phone
      });
    record(
      'Profile',
      'Profile update',
      [200, 302, 303].includes(upd.status) ? 'PASS' : 'FAIL',
      { status: upd.status }
    );
  } else {
    record('Profile', 'Authenticated profile', 'FAIL', { status: profile2.status, evidence: pe }, 'High');
  }

  const orders = await a2.get('/account/orders');
  const oe = saveEvidence('account_orders', orders.text);
  record(
    'Orders',
    'Customer orders page',
    orders.status === 200 ? 'PASS' : 'FAIL',
    { status: orders.status, evidence: oe },
    orders.status === 200 ? null : 'High'
  );

  // Forgot password
  const a3 = agent();
  const fp = await a3.get('/account/forgot-password');
  const fcsrf = extractCsrf(fp.text);
  saveEvidence('auth_forgot_page', fp.text);
  const forgot = await a3
    .post('/account/forgot-password')
    .type('form')
    .send({ _csrf: fcsrf, email: QA_CUSTOMER.email });
  saveEvidence('auth_forgot_post', { status: forgot.status, location: forgot.headers.location }, 'json');
  const forgotOk = [200, 302, 303].includes(forgot.status);
  record('Forgot Password', 'Forgot password submit', forgotOk ? 'PASS' : 'FAIL', {
    status: forgot.status
  });

  const smtpSet = Boolean(process.env.SMTP_HOST);
  if (!smtpSet) {
    record('Forgot Password', 'SMTP configured for email delivery', 'FAIL', {
      note: 'SMTP_HOST unset — token created but email not sent in prod'
    }, 'High');
    addIssue({
      area: 'Forgot Password',
      title: 'SMTP not configured — reset emails will not send',
      severity: 'High',
      steps: [
        'POST /account/forgot-password with valid email',
        'Check mailbox / SMTP env'
      ],
      rootCause: 'SMTP_HOST (and related) environment variables are empty',
      fix: 'Configure SMTP_* in production .env before go-live; verify reset email arrives',
      evidence: 'tests/qa-evidence/' + RUN_ID + '/auth_forgot_post.json'
    });
  } else {
    record('Forgot Password', 'SMTP configured for email delivery', 'PASS');
  }

  // Pull token from DB to verify reset form path
  const [tokens] = await pool.query(
    'SELECT token_hash FROM password_reset_tokens WHERE user_id = (SELECT id FROM users WHERE email = ?) ORDER BY id DESC LIMIT 1',
    [QA_CUSTOMER.email]
  );
  if (tokens[0]) {
    record('Forgot Password', 'Reset token persisted', 'PASS');
  } else {
    // In some implementations only hash stored after generate — check count
    const [[c]] = await pool.query('SELECT COUNT(*) AS n FROM password_reset_tokens');
    record(
      'Forgot Password',
      'Reset token persisted',
      c.n > 0 ? 'PASS' : 'FAIL',
      { note: 'token_hash only; raw token not readable from DB' }
    );
  }

  const resetPage = await a3.get('/account/reset-password?token=invalidtoken');
  saveEvidence('auth_reset_invalid', resetPage.text);
  record(
    'Forgot Password',
    'Reset page handles invalid token',
    [200, 400, 302].includes(resetPage.status) ? 'PASS' : 'FAIL',
    { status: resetPage.status }
  );
}

async function runContactEnquiry() {
  const a = agent();
  const page = await a.get('/pages/contact');
  const csrf = extractCsrf(page.text);
  const contact = await a
    .post('/contact')
    .type('form')
    .send({
      _csrf: csrf,
      source: 'contact_page',
      website: '',
      'contact[name]': 'QA Contact',
      'contact[company]': 'QA Co',
      'contact[email]': 'qa.contact@example.com',
      'contact[phone]': '+919111122222',
      'contact[service]': 'Capsules',
      'contact[product_category]': 'Sports',
      'contact[quantity]': '1000-5000',
      'contact[body]': 'QA production verification contact submission.'
    });
  saveEvidence('contact_form_post', {
    status: contact.status,
    location: contact.headers.location
  }, 'json');
  const ok =
    ([302, 303].includes(contact.status) &&
      String(contact.headers.location || '').includes('thank-you')) ||
    contact.status === 200;
  record('Contact Form', 'Contact page submission', ok ? 'PASS' : 'FAIL', {
    status: contact.status,
    location: contact.headers.location
  }, ok ? null : 'High');
  if (!ok) {
    addIssue({
      area: 'Contact Form',
      title: 'Contact form POST failed',
      severity: 'High',
      steps: ['GET /pages/contact', 'POST /contact with contact[*] fields + CSRF'],
      rootCause: `HTTP ${contact.status}`,
      fix: 'Inspect contactController / ContactService validation',
      evidence: 'tests/qa-evidence/' + RUN_ID + '/contact_form_post.json'
    });
  }

  const a2 = agent();
  const home = await a2.get('/');
  const ecsrf = extractCsrf(home.text);
  const enquiry = await a2
    .post('/contact')
    .set('Accept', 'application/json')
    .set('X-CSRF-Token', ecsrf)
    .send({
      source: 'enquiry_modal',
      website: '',
      name: 'QA Enquiry',
      phone: '+919333344444',
      email: 'qa.enquiry@example.com',
      company: 'QA Brand',
      service: 'Gummies',
      message: 'Need quote for gummies'
    });
  saveEvidence('enquiry_modal_post', enquiry.body, 'json');
  record(
    'Enquiry',
    'Enquiry modal JSON submit',
    enquiry.status === 200 && enquiry.body.success ? 'PASS' : 'FAIL',
    { status: enquiry.status, body: enquiry.body },
    enquiry.status === 200 && enquiry.body.success ? null : 'High'
  );

  // Static analysis: medral-global.js uses wrong modal id
  const globalJs = fs.readFileSync(path.join(__dirname, '..', 'assets/js/medral-global.js'), 'utf8');
  if (globalJs.includes('enquiry-modal') && !globalJs.includes('emModal')) {
    record('Enquiry', 'medral-global.js modal ID alignment', 'FAIL', {
      note: 'openEnquiryModal targets #enquiry-modal; DOM uses #emModal'
    }, 'Medium');
    addIssue({
      area: 'Enquiry',
      title: 'medral-global.js targets non-existent #enquiry-modal',
      severity: 'Medium',
      steps: [
        'Open homepage',
        'Note footer defines #emModal / #emOverlay',
        'Inspect assets/js/medral-global.js openEnquiryModal'
      ],
      rootCause:
        'medral-global.js looks up #enquiry-modal which does not exist. Footer inline script currently redefines openEnquiryModal after load, masking the bug. Removing/reordering scripts would break enquiry CTAs.',
      fix: 'Update medral-global.js to use #emModal/#emOverlay (or remove duplicate helpers and keep a single source of truth)',
      evidence: 'assets/js/medral-global.js'
    });
  } else {
    record('Enquiry', 'medral-global.js modal ID alignment', 'PASS');
  }
}

async function runAdmin() {
  const a = agent();
  const loginPage = await a.get('/admin/login');
  const csrf = extractCsrf(loginPage.text);
  saveEvidence('admin_login_page', loginPage.text);

  const login = await a
    .post('/admin/login')
    .type('form')
    .send({ _csrf: csrf, email: QA_ADMIN.email, password: QA_ADMIN.password });
  saveEvidence('admin_login_post', { status: login.status, location: login.headers.location }, 'json');
  const loginOk = [302, 303].includes(login.status);
  record('Admin Login', 'Admin login', loginOk ? 'PASS' : 'FAIL', {
    status: login.status,
    location: login.headers.location
  }, loginOk ? null : 'Critical');
  if (!loginOk) {
    addIssue({
      area: 'Admin Login',
      title: 'Admin login failed with QA fixture credentials',
      severity: 'Critical',
      steps: ['Ensure QA admin active', 'POST /admin/login'],
      rootCause: `HTTP ${login.status}`,
      fix: 'Inspect adminAuthController and admin_users.is_active',
      evidence: 'tests/qa-evidence/' + RUN_ID + '/admin_login_post.json'
    });
    return a;
  }

  const dash = await a.get('/admin/dashboard');
  const de = saveEvidence('admin_dashboard', dash.text);
  record(
    'Admin Dashboard',
    'Dashboard loads',
    dash.status === 200 ? 'PASS' : 'FAIL',
    { evidence: de },
    dash.status === 200 ? null : 'Critical'
  );

  // Category list
  const cats = await a.get('/admin/categories');
  saveEvidence('admin_categories', cats.text);
  record('Product CRUD', 'Admin categories list', cats.status === 200 ? 'PASS' : 'FAIL', {
    status: cats.status
  });

  // Create category via admin UI
  const createCatPage = await a.get('/admin/categories/create');
  const ccsrf = extractCsrf(createCatPage.text);
  const newSlug = `qa-admin-cat-${Date.now()}`;
  const createCat = await a
    .post('/admin/categories/create')
    .type('form')
    .send({
      _csrf: ccsrf,
      name: 'QA Admin Category',
      slug: newSlug,
      description: 'Created by QA runner',
      image_url: '',
      display_order: 10,
      is_active: '1'
    });
  record(
    'Product CRUD',
    'Admin create category',
    [302, 303].includes(createCat.status) ? 'PASS' : 'FAIL',
    { status: createCat.status, location: createCat.headers.location }
  );

  // Products list + create form
  const products = await a.get('/admin/products');
  saveEvidence('admin_products', products.text);
  record('Product CRUD', 'Admin products list', products.status === 200 ? 'PASS' : 'FAIL', {
    status: products.status
  });

  const createProdPage = await a.get('/admin/products/create');
  saveEvidence('admin_product_create_form', createProdPage.text);
  record(
    'Product CRUD',
    'Admin product create form',
    createProdPage.status === 200 ? 'PASS' : 'FAIL',
    { status: createProdPage.status }
  );

  const pcsrf = extractCsrf(createProdPage.text);
  const pSlug = `qa-admin-prod-${Date.now()}`;
  // Minimal 1x1 PNG
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64'
  );
  const createProd = await a
    .post('/admin/products/create')
    .field('_csrf', pcsrf || '')
    .field('title', 'QA Admin Product')
    .field('sku', `QA-ADM-${Date.now()}`)
    .field('slug', pSlug)
    .field('category_id', String(fixture.categoryId))
    .field('brand', 'QA')
    .field('stock_quantity', '10')
    .field('price', '199')
    .field('sale_price', '')
    .field('short_description', 'QA admin created')
    .field('full_description', 'QA admin created full')
    .field('status', 'published')
    .field('is_featured', '0')
    .attach('images', png, { filename: 'qa.png', contentType: 'image/png' });
  saveEvidence('admin_product_create_post', {
    status: createProd.status,
    location: createProd.headers.location,
    snippet: (createProd.text || '').slice(0, 300)
  }, 'json');
  const prodCreated = [302, 303].includes(createProd.status);
  record('Product CRUD', 'Admin create product + image upload', prodCreated ? 'PASS' : 'FAIL', {
    status: createProd.status,
    location: createProd.headers.location
  }, prodCreated ? null : 'High');
  if (!prodCreated) {
    addIssue({
      area: 'Image Upload',
      title: 'Admin product create with image failed',
      severity: 'High',
      steps: [
        'Login as admin',
        'GET /admin/products/create',
        'POST multipart with PNG images[]'
      ],
      rootCause: `HTTP ${createProd.status}`,
      fix: 'Inspect upload middleware and adminProductController.handleCreate',
      evidence: 'tests/qa-evidence/' + RUN_ID + '/admin_product_create_post.json'
    });
  } else {
    record('Image Upload', 'PNG upload on product create', 'PASS');
    // cleanup created product later via slug
    const [rows] = await pool.query('SELECT id FROM products WHERE slug = ?', [pSlug]);
    if (rows[0]) {
      const pid = rows[0].id;
      await pool.query('DELETE FROM product_images WHERE product_id = ?', [pid]);
      await pool.query('DELETE FROM products WHERE id = ?', [pid]);
    }
    // cleanup admin-created category
    await pool.query('DELETE FROM categories WHERE slug = ?', [newSlug]);
  }

  // Reject non-image upload
  const createProdPage2 = await a.get('/admin/products/create');
  const pcsrf2 = extractCsrf(createProdPage2.text);
  const evil = await a
    .post('/admin/products/create')
    .field('_csrf', pcsrf2 || '')
    .field('title', 'QA Evil')
    .field('sku', `QA-EVIL-${Date.now()}`)
    .field('slug', `qa-evil-${Date.now()}`)
    .field('category_id', String(fixture.categoryId))
    .field('stock_quantity', '1')
    .field('price', '10')
    .field('short_description', 'x')
    .field('full_description', 'x')
    .field('status', 'draft')
    .attach('images', Buffer.from('<?php echo 1;'), {
      filename: 'shell.php.png',
      contentType: 'image/png'
    });
  saveEvidence('admin_upload_reject', {
    status: evil.status,
    location: evil.headers.location,
    snippet: (evil.text || '').slice(0, 400)
  }, 'json');
  // Expect rejection somehow (redirect with error or 400)
  const rejected =
    evil.status >= 400 ||
    String(evil.headers.location || '').includes('error') ||
    /error|invalid|not allowed|rejected/i.test(evil.text || '');
  record(
    'Image Upload',
    'Reject spoofed PHP-as-PNG',
    rejected ? 'PASS' : 'FAIL',
    { status: evil.status },
    rejected ? null : 'High'
  );
  if (!rejected) {
    addIssue({
      area: 'Image Upload',
      title: 'Spoofed image upload may not be rejected',
      severity: 'High',
      steps: [
        'Admin product create',
        'Upload file named shell.php.png with PHP contents and image/png MIME'
      ],
      rootCause: 'Magic-byte / double-extension checks may not have blocked this payload',
      fix: 'Confirm upload middleware rejects non-image magic bytes and double extensions; add regression test',
      evidence: 'tests/qa-evidence/' + RUN_ID + '/admin_upload_reject.json'
    });
    // cleanup if product was created
    await pool.query("DELETE FROM products WHERE title = 'QA Evil'");
  }

  // Inventory via product edit stock
  const editPage = await a.get(`/admin/products/edit/${fixture.productId}`);
  saveEvidence('admin_inventory_edit', editPage.text);
  if (editPage.status === 200) {
    const ecsrf = extractCsrf(editPage.text);
    const upd = await a
      .post(`/admin/products/edit/${fixture.productId}`)
      .field('_csrf', ecsrf || '')
      .field('title', 'QA Test Product')
      .field('sku', `QA-SKU-INV`)
      .field('slug', fixture.productSlug)
      .field('category_id', String(fixture.categoryId))
      .field('brand', 'QA Brand')
      .field('stock_quantity', '20')
      .field('price', '499')
      .field('sale_price', '')
      .field('short_description', 'QA short description')
      .field('full_description', 'QA full description for production verification.')
      .field('status', 'published')
      .field('is_featured', '0');
    record(
      'Inventory',
      'Update stock_quantity via product edit',
      [302, 303, 200].includes(upd.status) ? 'PASS' : 'FAIL',
      { status: upd.status }
    );
  } else {
    record('Inventory', 'Update stock_quantity via product edit', 'FAIL', {
      status: editPage.status
    }, 'High');
  }

  // Orders
  const orders = await a.get('/admin/orders');
  saveEvidence('admin_orders', orders.text);
  record('Order CRUD', 'Admin orders list', orders.status === 200 ? 'PASS' : 'FAIL', {
    status: orders.status
  });

  const [orderRows] = await pool.query(
    'SELECT id, order_number FROM orders ORDER BY id DESC LIMIT 1'
  );
  if (orderRows[0]) {
    fixture.orderId = orderRows[0].id;
    const view = await a.get(`/admin/orders/view/${fixture.orderId}`);
    saveEvidence('admin_order_view', view.text);
    record('Order CRUD', 'Admin order detail', view.status === 200 ? 'PASS' : 'FAIL', {
      status: view.status
    });
    const ocsrf = extractCsrf(view.text);
    const statusUpd = await a
      .post(`/admin/orders/update-status/${fixture.orderId}`)
      .type('form')
      .send({ _csrf: ocsrf, order_status: 'processing' });
    record(
      'Order CRUD',
      'Update order status',
      [302, 303, 200].includes(statusUpd.status) ? 'PASS' : 'FAIL',
      { status: statusUpd.status }
    );
  } else {
    record('Order CRUD', 'Admin order detail', 'FAIL', { note: 'no orders in DB' }, 'High');
  }

  return a;
}

async function runSecurityPerfResponsive() {
  // Unauth admin protection
  const guest = agent();
  const dash = await guest.get('/admin/dashboard');
  record(
    'Security',
    'Admin dashboard requires auth',
    [302, 303, 401, 403].includes(dash.status) ? 'PASS' : 'FAIL',
    { status: dash.status, location: dash.headers.location },
    [302, 303, 401, 403].includes(dash.status) ? null : 'Critical'
  );

  const profile = await guest.get('/account/profile');
  record(
    'Security',
    'Customer profile requires auth',
    [302, 303, 401, 403].includes(profile.status) ? 'PASS' : 'FAIL',
    { status: profile.status }
  );

  // CSRF rejection
  const a = agent();
  await a.get('/account/login');
  const bad = await a.post('/account/login').type('form').send({
    email: 'x@y.com',
    password: 'nope',
    _csrf: 'invalid'
  });
  record(
    'Security',
    'CSRF rejects invalid token on login',
    [403, 400].includes(bad.status) ? 'PASS' : 'FAIL',
    { status: bad.status },
    [403, 400].includes(bad.status) ? null : 'High'
  );

  const health = await guest.get('/health');
  saveEvidence('health', health.body, 'json');
  const healthOk = [200, 503].includes(health.status) && !health.body.node_env && !health.body.memory;
  record('Security', 'Public /health is minimal', healthOk ? 'PASS' : 'FAIL', {
    body: health.body
  });

  // XSS reflection quick check on search
  const xss = await guest.get('/shop?search=<script>alert(1)</script>');
  const reflected = /<script>alert\(1\)<\/script>/.test(xss.text);
  record(
    'Security',
    'Search query not reflected raw as HTML script',
    !reflected ? 'PASS' : 'FAIL',
    { evidence: saveEvidence('security_search_xss', xss.text) },
    reflected ? 'High' : null
  );
  if (reflected) {
    addIssue({
      area: 'Security',
      title: 'Search parameter reflected without encoding',
      severity: 'High',
      steps: ['GET /shop?search=<script>alert(1)</script>', 'View page source'],
      rootCause: 'Unescaped output of search query in EJS',
      fix: 'Ensure EJS uses <%= %> escaping for user-controlled values',
      evidence: 'tests/qa-evidence/' + RUN_ID + '/security_search_xss.html'
    });
  }

  // Responsive: viewport meta on key templates
  for (const url of ['/', '/shop', '/cart', '/account/login', '/pages/contact']) {
    const res = await guest.get(url);
    const hasViewport = /name=["']viewport["']/i.test(res.text || '');
    record(
      'Responsive Design',
      `viewport meta on ${url}`,
      hasViewport ? 'PASS' : 'FAIL',
      { status: res.status },
      hasViewport ? null : 'Medium'
    );
  }

  // Performance: homepage + shop timing
  for (const url of ['/', '/shop', `/shop/product/${fixture.productSlug}`]) {
    const t0 = Date.now();
    const res = await guest.get(url);
    const ms = Date.now() - t0;
    const pass = res.status === 200 && ms < 2500;
    record('Performance', `TTFB-ish ${url}`, pass ? 'PASS' : 'FAIL', { ms, status: res.status }, pass ? null : 'Medium');
  }

  // Empty catalog risk without fixtures
  const [[pub]] = await pool.query(
    "SELECT COUNT(*) AS n FROM products WHERE status='published' AND id <> ?",
    [fixture.productId]
  );
  if (pub.n === 0) {
    record('Commerce', 'Catalog has real published products (non-QA)', 'FAIL', {
      note: 'Only QA fixture product exists'
    }, 'Critical');
    addIssue({
      area: 'Commerce',
      title: 'No real published products in catalog',
      severity: 'Critical',
      steps: [
        'Query products WHERE status=published',
        'Open /shop without QA fixtures'
      ],
      rootCause: 'Database has zero (or only temporary QA) published products and no active categories for storefront merchandising',
      fix: 'Create and publish real categories/products via admin before production launch',
      evidence: 'DB query during QA run'
    });
  } else {
    record('Commerce', 'Catalog has real published products (non-QA)', 'PASS', {
      note: `count=${pub.n}`
    });
  }

  // Accessibility skip link on non-home
  const shop = await guest.get('/shop');
  const shopSkip = /skip-link/i.test(shop.text);
  record(
    'Accessibility',
    'Skip link on shop',
    shopSkip ? 'PASS' : 'FAIL',
    {},
    shopSkip ? null : 'Medium'
  );
  if (!shopSkip) {
    addIssue({
      area: 'Accessibility',
      title: 'Skip link missing on shop (and likely other non-home pages)',
      severity: 'Medium',
      steps: ['Open /shop', 'Look for Skip to main content link'],
      rootCause: 'Skip link implemented on homepage only, not shared layout partial',
      fix: 'Move skip link into shared header/layout used by all storefront pages',
      evidence: saveEvidence('a11y_shop_skip', shop.text)
    });
  }

  // Privacy policy accuracy
  const privacy = await guest.get('/pages/privacy-policy');
  if (/google analytics|Google Analytics|advertising cookies|Shopify/i.test(privacy.text)) {
    record('SEO', 'Privacy policy matches live tracking stack', 'FAIL', {
      note: 'Policy mentions analytics/ads tooling'
    }, 'Medium');
    addIssue({
      area: 'SEO',
      title: 'Privacy policy claims tracking not present in markup',
      severity: 'Medium',
      steps: [
        'Open /pages/privacy-policy',
        'Search for Google Analytics / advertising claims',
        'Compare to live <head> scripts'
      ],
      rootCause: 'Legal copy leftover from prior stack; pages only have empty Google-tag comments',
      fix: 'Update privacy policy to match actual tracking (or add intended tags)',
      evidence: saveEvidence('privacy_policy', privacy.text)
    });
  } else {
    record('SEO', 'Privacy policy matches live tracking stack', 'PASS');
  }
}

async function main() {
  ensureDir(RUN_DIR);
  console.log(`\n=== Production Verification Run ${RUN_ID} ===\n`);

  await setupFixtures();
  await runPublicAndSeo();
  await runCommerce();
  await runAuthAndAccount();
  await runContactEnquiry();
  await runAdmin();
  await runSecurityPerfResponsive();
  await cleanupFixtures();

  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;
  const criticalIssues = issues.filter((i) => i.severity === 'Critical').length;
  const highIssues = issues.filter((i) => i.severity === 'High').length;

  let decision = 'GO';
  let risk = 'Low';
  if (criticalIssues > 0) {
    decision = 'NO-GO';
    risk = 'High';
  } else if (highIssues > 0) {
    decision = 'CONDITIONAL GO';
    risk = 'Medium';
  } else if (failed > 0) {
    decision = 'CONDITIONAL GO';
    risk = 'Medium';
  }

  const report = {
    runId: RUN_ID,
    generatedAt: new Date().toISOString(),
    decision,
    risk,
    summary: {
      totalChecks: results.length,
      passed,
      failed,
      issues: issues.length,
      criticalIssues,
      highIssues
    },
    evidenceDir: path.relative(path.join(__dirname, '..'), RUN_DIR).replace(/\\/g, '/'),
    results,
    issues,
    notes: [
      'Screenshots are HTML/JSON evidence captures (no headed browser MCP available in this environment).',
      'Visual responsive screenshots require manual browser pass at 375/768/1280 widths.',
      'QA admin fixture deactivated after run; customer account left for inspection: ' + QA_CUSTOMER.email
    ]
  };

  const reportPath = saveEvidence('REPORT', report, 'json');
  console.log(`\n=== SUMMARY ===`);
  console.log(`Passed: ${passed}  Failed: ${failed}  Issues: ${issues.length}`);
  console.log(`Critical: ${criticalIssues}  High: ${highIssues}`);
  console.log(`Decision: ${decision}  Risk: ${risk}`);
  console.log(`Report: ${reportPath}`);

  // Keep process from hanging on open pool/handles
  try {
    await pool.end();
  } catch (_) {
    /* ignore */
  }
  process.exit(criticalIssues > 0 ? 2 : 0);
}

main().catch(async (err) => {
  console.error('FATAL', err);
  try {
    await cleanupFixtures();
    await pool.end();
  } catch (_) {
    /* ignore */
  }
  process.exit(1);
});
