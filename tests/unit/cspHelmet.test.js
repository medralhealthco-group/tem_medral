'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { buildHelmetOptions, cspNonce } = require('../../middlewares/cspMiddleware');

test('Suite CSP / Helmet hardening', async t => {
  await t.test('buildHelmetOptions excludes script-src unsafe-inline', () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    const opts = buildHelmetOptions();
    process.env.NODE_ENV = prev;

    const scriptSrc = opts.contentSecurityPolicy.directives.scriptSrc;
    const asStrings = scriptSrc.filter(x => typeof x === 'string');
    assert.ok(!asStrings.includes("'unsafe-inline'"));
    assert.ok(asStrings.includes("'self'"));
    assert.equal(typeof scriptSrc.find(x => typeof x === 'function'), 'function');
    assert.deepEqual(opts.contentSecurityPolicy.directives.objectSrc, ["'none'"]);
    assert.equal(opts.hidePoweredBy, true);
    assert.ok(opts.hsts);
  });

  await t.test('cspNonce middleware sets res.locals.cspNonce', () => {
    const req = {};
    const res = { locals: {} };
    let called = false;
    cspNonce(req, res, () => {
      called = true;
    });
    assert.equal(called, true);
    assert.ok(res.locals.cspNonce);
    assert.equal(res.locals.cspNonce, req.cspNonce);
    assert.match(res.locals.cspNonce, /^[A-Za-z0-9+/=]+$/);
  });
});
