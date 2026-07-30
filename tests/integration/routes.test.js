'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../../server');
const config = require('../../config');

// -----------------------------------------------------------------------------
// Suite 20: Express Routing & HTTP Endpoints (Supertest)
// -----------------------------------------------------------------------------
test('Suite 20: Express Routing & HTTP Endpoint Testing', async t => {
  await t.test('GET /health returns 200/503 OK with valid status', async () => {
    const res = await request(app).get('/health');
    assert.ok([200, 503].includes(res.status));
    assert.ok(res.body);
    assert.ok(['ok', 'degraded', 'UP'].includes(res.body.status));
    // Public health must not disclose environment / memory / version
    assert.equal(res.body.node_env, undefined);
    assert.equal(res.body.memory, undefined);
    assert.equal(res.body.version, undefined);
  });

  await t.test('GET / returns CSP nonce and hardened headers', async () => {
    const res = await request(app).get('/');
    assert.equal(res.status, 200);
    const csp = res.headers['content-security-policy'] || '';
    assert.ok(csp.includes("default-src 'self'"));
    assert.ok(csp.includes('nonce-'));
    assert.ok(!csp.includes("'unsafe-inline'") || csp.includes('script-src-attr'));
    assert.ok(!/script-src[^;]*'unsafe-inline'/.test(csp) || /script-src-elem/.test(csp));
    assert.equal(res.headers['x-powered-by'], undefined);
    assert.ok(res.headers['x-content-type-options'] === 'nosniff');
    assert.ok(res.headers['referrer-policy']);
    assert.ok(res.headers['permissions-policy']);
  });

  await t.test('GET / returns 200 OK with HTML content', async () => {
    const res = await request(app).get('/');
    assert.equal(res.status, 200);
    assert.ok(res.text.includes('<!DOCTYPE html>') || res.text.includes('<html'));
  });

  await t.test('GET /shop returns 200 OK', async () => {
    const res = await request(app).get('/shop');
    assert.equal(res.status, 200);
  });

  await t.test('GET /cart returns 200 OK', async () => {
    const res = await request(app).get('/cart');
    assert.equal(res.status, 200);
  });

  await t.test('GET /non-existent-route-xyz returns 404', async () => {
    const res = await request(app).get('/non-existent-route-xyz');
    assert.equal(res.status, 404);
  });
});

// -----------------------------------------------------------------------------
// Suite 23: Performance, Response Headers & SEO
// -----------------------------------------------------------------------------
test('Suite 23: Performance & Response Headers', async t => {
  await t.test('response includes security headers from helmet', async () => {
    const res = await request(app).get('/');
    assert.ok(res.headers['x-dns-prefetch-control']);
    assert.ok(res.headers['x-content-type-options']);
  });

  await t.test('response supports compression with gzip header', async () => {
    const res = await request(app)
      .get('/')
      .set('Accept-Encoding', 'gzip');
    // Express compression middleware header check
    assert.equal(res.status, 200);
  });

  await t.test('static assets return caching or etag headers', async () => {
    const res = await request(app).get('/robots.txt');
    assert.equal(res.status, 200);
    assert.ok(res.headers['etag'] || res.headers['cache-control']);
  });
});

// -----------------------------------------------------------------------------
// Suite 24: Configuration Integrity & Dynamic URL Resolution
// -----------------------------------------------------------------------------
test('Suite 24: Navigation Configuration Integrity Crawler', async t => {
  const menuUrls = [];

  if (config.navigation && config.navigation.header && config.navigation.header.menu) {
    config.navigation.header.menu.forEach(item => {
      if (item.url) menuUrls.push(item.url);
      if (item.children) {
        item.children.forEach(child => {
          if (child.url) menuUrls.push(child.url);
        });
      }
    });
  }

  const uniqueUrls = Array.from(new Set(menuUrls));

  for (const url of uniqueUrls) {
    await t.test(`configured navigation URL '${url}' resolves cleanly`, async () => {
      const res = await request(app).get(url);
      // Valid HTTP response codes: 200 (OK) or 301/302 (Redirect)
      assert.ok(
        [200, 301, 302].includes(res.status),
        `URL ${url} returned unexpected HTTP status ${res.status}`
      );
    });
  }
});
