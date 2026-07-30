'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const config = require('../../config');
const { validateConfig } = require('../../utils/configValidator');
const deepFreeze = require('../../utils/deepFreeze');
const {
  normalizePath,
  isActiveUrl,
  getNavigation,
  getBreadcrumbs
} = require('../../services/navigationService');
const { handleRedirects } = require('../../middlewares/redirectMiddleware');

test('Config Immutability & Deep Freeze', async t => {
  await t.test('config object and nested properties are frozen', () => {
    assert.equal(Object.isFrozen(config), true);
    assert.equal(Object.isFrozen(config.site), true);
    assert.equal(Object.isFrozen(config.navigation), true);
    assert.equal(Object.isFrozen(config.navigation.header), true);
  });

  await t.test('deepFreeze freezes deeply nested objects', () => {
    const mutable = { a: { b: { c: 1 } } };
    deepFreeze(mutable);
    assert.throws(() => {
      mutable.a.b.c = 2;
    }, TypeError);
  });
});

test('Config Validator', async t => {
  await t.test('passes validation for valid configuration', () => {
    assert.equal(validateConfig(config), true);
  });

  await t.test('throws error if config object is missing', () => {
    assert.throws(() => validateConfig(null), /Configuration object is missing/);
  });

  await t.test('detects duplicate navigation item IDs', () => {
    const invalidConfig = {
      navigation: {
        header: {
          menu: [
            { id: 'dup', title: 'A', url: '/a' },
            { id: 'dup', title: 'B', url: '/b' }
          ]
        }
      }
    };
    assert.throws(() => validateConfig(invalidConfig), /Duplicate item ID detected: 'dup'/);
  });

  await t.test('detects invalid HTTP redirect status code', () => {
    const invalidConfig = {
      redirects: [{ from: '/old', to: '/new', code: 500 }]
    };
    assert.throws(() => validateConfig(invalidConfig), /Invalid HTTP redirect status code '500'/);
  });

  await t.test('detects self-referencing redirects', () => {
    const invalidConfig = {
      redirects: [{ from: '/same', to: '/same', code: 301 }]
    };
    assert.throws(
      () => validateConfig(invalidConfig),
      /Self-referencing redirect detected for: '\/same'/
    );
  });
});

test('Navigation Service & URL Normalization', async t => {
  await t.test('normalizePath converts to lowercase, strips trailing slash and .html', () => {
    assert.equal(normalizePath('/ABOUT/'), '/about');
    assert.equal(normalizePath('/pages/about-us.html'), '/pages/about-us');
    assert.equal(normalizePath('/contact?ref=footer#form'), '/contact');
    assert.equal(normalizePath('//products//catalog/'), '/products/catalog');
    assert.equal(normalizePath('/'), '/');
    assert.equal(normalizePath(null), '/');
  });

  await t.test('isActiveUrl correctly identifies active routes', () => {
    assert.equal(isActiveUrl('/', '/'), true);
    assert.equal(isActiveUrl('/about', '/about'), true);
    assert.equal(isActiveUrl('/about', '/about/team'), true);
    assert.equal(isActiveUrl('/contact', '/about'), false);
  });

  await t.test('getNavigation builds header and footer menu structures', () => {
    const nav = getNavigation('/pages/about-us');
    assert.ok(nav.header);
    assert.ok(nav.footer);
    assert.ok(Array.isArray(nav.header.menu));
    assert.ok(Array.isArray(nav.footer.quickLinks));
  });

  await t.test('getBreadcrumbs generates correct trail', () => {
    const breadcrumbs = getBreadcrumbs('/pages/about-us');
    assert.ok(Array.isArray(breadcrumbs));
    assert.equal(breadcrumbs[0].title, 'Home');
    assert.equal(breadcrumbs[0].url, '/');
  });
});

test('Redirect Middleware', async t => {
  await t.test('redirects matching path with 301', () => {
    const req = { path: '/ABOUT/' };
    let redirected = false;
    let statusCode = null;
    let redirectUrl = null;

    const res = {
      redirect: (code, to) => {
        redirected = true;
        statusCode = code;
        redirectUrl = to;
      }
    };

    handleRedirects(req, res, () => {});

    assert.equal(redirected, true);
    assert.equal(statusCode, 301);
    assert.equal(redirectUrl, '/pages/about-us.html');
  });

  await t.test('passes through un-redirected path', () => {
    const req = { path: '/some-normal-page' };
    let nextCalled = false;

    const res = {
      redirect: () => {
        assert.fail('Should not redirect');
      }
    };

    handleRedirects(req, res, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, true);
  });
});
