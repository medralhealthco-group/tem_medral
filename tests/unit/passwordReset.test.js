'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const PasswordResetModel = require('../../models/passwordResetModel');
const { validatePasswordComplexity } = require('../../services/authService');

test('Suite Password Reset tokens', async t => {
  await t.test('generates 64-char hex raw tokens', () => {
    const token = PasswordResetModel.generateRawToken();
    assert.match(token, /^[a-f0-9]{64}$/);
  });

  await t.test('hashes tokens with SHA-256', () => {
    const token = 'a'.repeat(64);
    const expected = crypto.createHash('sha256').update(token, 'utf8').digest('hex');
    assert.equal(PasswordResetModel.hashToken(token), expected);
    assert.equal(PasswordResetModel.hashToken(token).length, 64);
  });

  await t.test('expiry is one hour ahead', () => {
    const from = new Date('2026-01-01T00:00:00.000Z');
    const expires = PasswordResetModel.getExpiryDate(from);
    assert.equal(expires.toISOString(), '2026-01-01T01:00:00.000Z');
  });

  await t.test('password complexity rules', () => {
    assert.throws(() => validatePasswordComplexity('short'), /8 characters/);
    assert.throws(() => validatePasswordComplexity('onlyletters'), /letter and one number/);
    assert.doesNotThrow(() => validatePasswordComplexity('Secure1!'));
  });
});
