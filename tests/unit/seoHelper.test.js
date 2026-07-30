'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { getSeoMetadata, getSiteOrigin, toAbsoluteUrl } = require('../../utils/seoHelper');

function mockReq(path = '/pages/contact') {
  return {
    protocol: 'http',
    originalUrl: path + '?utm=1',
    get: () => 'localhost:3000'
  };
}

test('Suite SEO Helper', async t => {
  await t.test('builds absolute canonical without query string', () => {
    const seo = getSeoMetadata('Contact | Medral', 'Contact us today.', mockReq());
    assert.equal(seo.canonicalUrl, 'http://localhost:3000/pages/contact');
    assert.equal(seo.ogUrl, seo.canonicalUrl);
    assert.ok(seo.ogImage.startsWith('http'));
    assert.equal(seo.ogType, 'website');
    assert.ok(seo.twitterCard);
  });

  await t.test('absolutizes relative OG images', () => {
    const seo = getSeoMetadata('P', 'D', mockReq('/shop/product/x'), {
      type: 'product',
      image: '/uploads/product-1.jpg'
    });
    assert.equal(seo.ogType, 'product');
    assert.equal(seo.ogImage, 'http://localhost:3000/uploads/product-1.jpg');
  });

  await t.test('supports robots meta option', () => {
    const seo = getSeoMetadata('Cart', 'Cart page', mockReq('/cart'), {
      robots: 'noindex, nofollow'
    });
    assert.equal(seo.robots, 'noindex, nofollow');
  });

  await t.test('toAbsoluteUrl and getSiteOrigin helpers', () => {
    assert.equal(toAbsoluteUrl('https://www.medralhealth.com', '/shop'), 'https://www.medralhealth.com/shop');
    assert.equal(toAbsoluteUrl('https://www.medralhealth.com', 'https://cdn.example/a.jpg'), 'https://cdn.example/a.jpg');
    assert.equal(getSiteOrigin(mockReq()), 'http://localhost:3000');
  });
});
