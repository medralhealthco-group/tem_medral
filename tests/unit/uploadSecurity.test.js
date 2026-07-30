'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const {
  detectImageType,
  isAllowedExtension,
  isAllowedMime,
  generateSafeFilename,
  resolveSafeUploadPath,
  deleteUploadByUrl,
  UPLOAD_DIR
} = require('../../utils/uploadSecurity');

test('Suite Upload Security: magic bytes and filename hardening', async t => {
  await t.test('detects JPEG / PNG / WebP magic bytes', () => {
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
    const webp = Buffer.from([
      0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50
    ]);
    assert.equal(detectImageType(jpeg), 'jpeg');
    assert.equal(detectImageType(png), 'png');
    assert.equal(detectImageType(webp), 'webp');
  });

  await t.test('rejects non-image / truncated buffers', () => {
    assert.equal(detectImageType(Buffer.from('<?php system($_GET[c]); ?>')), null);
    assert.equal(detectImageType(Buffer.from([0xff, 0xd8])), null);
    assert.equal(detectImageType(null), null);
  });

  await t.test('allows only image extensions and MIME types', () => {
    assert.equal(isAllowedExtension('.jpg'), true);
    assert.equal(isAllowedExtension('.jpeg'), true);
    assert.equal(isAllowedExtension('.png'), true);
    assert.equal(isAllowedExtension('.webp'), true);
    assert.equal(isAllowedExtension('.php'), false);
    assert.equal(isAllowedExtension('.svg'), false);
    assert.equal(isAllowedMime('image/jpeg'), true);
    assert.equal(isAllowedMime('image/png'), true);
    assert.equal(isAllowedMime('application/octet-stream'), false);
    assert.equal(isAllowedMime('text/html'), false);
  });

  await t.test('generates opaque product filenames', () => {
    const name = generateSafeFilename('.jpg');
    assert.match(name, /^product-\d+-[a-f0-9]{32}\.jpg$/);
  });

  await t.test('resolveSafeUploadPath blocks traversal and odd names', () => {
    assert.equal(resolveSafeUploadPath('../evil.jpg'), null);
    assert.equal(resolveSafeUploadPath('shell.php'), null);
    assert.equal(resolveSafeUploadPath('product-1-abc.jpg'), null);

    const okLegacy = resolveSafeUploadPath('product-1700000000000-123456789.jpg');
    assert.ok(okLegacy);
    assert.equal(path.dirname(okLegacy), UPLOAD_DIR);

    const okNew = resolveSafeUploadPath(`product-1700000000000-${'a'.repeat(32)}.png`);
    assert.ok(okNew);
    assert.equal(path.dirname(okNew), UPLOAD_DIR);
  });

  await t.test('deleteUploadByUrl only accepts /uploads/<safe-name>', () => {
    assert.equal(deleteUploadByUrl('https://evil.test/uploads/x.jpg'), false);
    assert.equal(deleteUploadByUrl('/uploads/../package.json'), false);
    assert.equal(deleteUploadByUrl('/uploads/not-a-product.png'), false);
  });
});
