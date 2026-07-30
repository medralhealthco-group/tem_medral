const bcrypt = require('bcryptjs');
const UserModel = require('../models/userModel');
const PasswordResetModel = require('../models/passwordResetModel');
const { sendPasswordResetEmail } = require('./emailService');
const { getSiteOrigin } = require('../utils/seoHelper');
const AuditLogger = require('../utils/auditLogger');
const logger = require('../utils/logger');

const GENERIC_RESET_MESSAGE =
  'If an account exists for that email, you will receive password reset instructions shortly.';

function validatePasswordComplexity(password) {
  if (!password || password.length < 8) {
    throw new Error('Password must be at least 8 characters long.');
  }
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumberOrSymbol = /[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
  if (!hasLetter || !hasNumberOrSymbol) {
    throw new Error(
      'Password must contain at least one letter and one number or special character.'
    );
  }
}

function isValidRawToken(token) {
  return typeof token === 'string' && /^[a-f0-9]{64}$/i.test(token);
}

class AuthService {
  static async registerCustomer({ firstName, lastName, email, phone, password, confirmPassword }) {
    if (!firstName || !lastName || !email || !password) {
      throw new Error('Please fill in all required fields.');
    }

    validatePasswordComplexity(password);

    if (password !== confirmPassword) {
      throw new Error('Passwords do not match.');
    }

    const cleanEmail = email.toLowerCase().trim();
    const existingUser = await UserModel.findUserByEmail(cleanEmail);
    if (existingUser) {
      throw new Error('An account with this email address already exists.');
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const userId = await UserModel.createUser({
      email: cleanEmail,
      passwordHash,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone ? phone.trim() : null
    });

    return {
      id: userId,
      email: cleanEmail,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      role: 'customer'
    };
  }

  static async loginCustomer({ email, password }) {
    if (!email || !password) {
      throw new Error('Please enter both email and password.');
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await UserModel.findUserByEmail(cleanEmail);
    if (!user || !user.is_active) {
      throw new Error('Invalid email or password.');
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      throw new Error('Invalid email or password.');
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role
    };
  }

  static async loginAdmin({ email, password }) {
    if (!email || !password) {
      throw new Error('Please enter both email and password.');
    }

    const cleanEmail = email.toLowerCase().trim();
    const admin = await UserModel.findAdminByEmail(cleanEmail);
    if (!admin || !admin.is_active) {
      throw new Error('Invalid administrator credentials.');
    }

    const isMatch = await bcrypt.compare(password, admin.password_hash);
    if (!isMatch) {
      throw new Error('Invalid administrator credentials.');
    }

    await UserModel.updateAdminLastLogin(admin.id);

    return {
      id: admin.id,
      email: admin.email,
      fullName: admin.full_name,
      role: admin.role
    };
  }

  static async updateCustomerProfile(userId, { firstName, lastName, phone }) {
    if (!firstName || !lastName) {
      throw new Error('First and Last name are required.');
    }

    await UserModel.updateUserProfile(userId, {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone ? phone.trim() : null
    });

    return {
      firstName: firstName.trim(),
      lastName: lastName.trim()
    };
  }

  static async updateCustomerPassword(
    userId,
    email,
    { currentPassword, newPassword, confirmPassword }
  ) {
    if (!currentPassword || !newPassword || !confirmPassword) {
      throw new Error('All password fields are required.');
    }

    validatePasswordComplexity(newPassword);

    if (newPassword !== confirmPassword) {
      throw new Error('New passwords do not match.');
    }

    const dbUser = await UserModel.findUserByEmail(email);
    if (!dbUser) {
      throw new Error('User account not found.');
    }

    const isMatch = await bcrypt.compare(currentPassword, dbUser.password_hash);
    if (!isMatch) {
      throw new Error('Incorrect current password.');
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    await UserModel.updateUserPassword(userId, newHash);
    await PasswordResetModel.invalidateActiveTokensForUser(userId);
    return true;
  }

  static async updateAdminPassword(adminId, { currentPassword, newPassword, confirmPassword }) {
    if (!currentPassword || !newPassword || !confirmPassword) {
      throw new Error('All password fields are required.');
    }

    validatePasswordComplexity(newPassword);

    if (newPassword !== confirmPassword) {
      throw new Error('New passwords do not match.');
    }

    const admin = await UserModel.findAdminById(adminId);
    if (!admin) {
      throw new Error('Administrator account not found.');
    }

    const isMatch = await bcrypt.compare(currentPassword, admin.password_hash);
    if (!isMatch) {
      throw new Error('Incorrect current password.');
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    await UserModel.updateAdminPassword(adminId, newHash);
    return true;
  }

  /**
   * Request a password reset email.
   * Always returns a generic message to avoid account enumeration.
   */
  static async requestPasswordReset({ email, req }) {
    const cleanEmail = (email || '').toLowerCase().trim();
    const ip = (req && (req.ip || (req.connection && req.connection.remoteAddress))) || null;

    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      throw new Error('Please enter a valid email address.');
    }

    const user = await UserModel.findUserByEmail(cleanEmail);

    if (user && user.is_active) {
      await PasswordResetModel.invalidateActiveTokensForUser(user.id);

      const rawToken = PasswordResetModel.generateRawToken();
      const tokenHash = PasswordResetModel.hashToken(rawToken);
      const expiresAt = PasswordResetModel.getExpiryDate();

      await PasswordResetModel.createToken({
        userId: user.id,
        tokenHash,
        expiresAt,
        requestIp: ip
      });

      const origin = getSiteOrigin(req);
      const resetUrl = `${origin}/account/reset-password?token=${rawToken}`;
      const expiresInMinutes = Math.round(PasswordResetModel.TOKEN_TTL_MS / 60000);

      try {
        await sendPasswordResetEmail({
          to: user.email,
          firstName: user.first_name,
          resetUrl,
          expiresInMinutes
        });
      } catch (err) {
        logger.error('[AUTH] Failed to send password reset email', {
          userId: user.id,
          error: err.message
        });
      }

      AuditLogger.logAuth({
        userId: user.id,
        email: user.email,
        action: 'PASSWORD_RESET_REQUESTED',
        ip,
        details: { expiresAt: expiresAt.toISOString() }
      });
    } else {
      AuditLogger.logAuth({
        userId: null,
        email: cleanEmail,
        action: 'PASSWORD_RESET_REQUESTED_UNKNOWN',
        ip,
        details: {}
      });
    }

    PasswordResetModel.purgeExpired().catch(() => {});

    return { message: GENERIC_RESET_MESSAGE };
  }

  /** Validate token for the reset form (does not consume it). */
  static async validateResetToken(rawToken) {
    if (!isValidRawToken(rawToken)) {
      throw new Error('This password reset link is invalid or has expired.');
    }
    const tokenHash = PasswordResetModel.hashToken(rawToken);
    const record = await PasswordResetModel.findValidByTokenHash(tokenHash);
    if (!record) {
      throw new Error('This password reset link is invalid or has expired.');
    }
    return {
      email: record.email,
      firstName: record.first_name
    };
  }

  /** Consume token and set a new password. */
  static async resetPasswordWithToken({ token, newPassword, confirmPassword, req }) {
    if (!isValidRawToken(token)) {
      throw new Error('This password reset link is invalid or has expired.');
    }

    validatePasswordComplexity(newPassword);

    if (newPassword !== confirmPassword) {
      throw new Error('Passwords do not match.');
    }

    const tokenHash = PasswordResetModel.hashToken(token);
    const record = await PasswordResetModel.findValidByTokenHash(tokenHash);
    if (!record) {
      throw new Error('This password reset link is invalid or has expired.');
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    await UserModel.updateUserPassword(record.user_id, newHash);
    await PasswordResetModel.markUsed(record.id);
    await PasswordResetModel.invalidateActiveTokensForUser(record.user_id);

    const ip = (req && (req.ip || (req.connection && req.connection.remoteAddress))) || null;
    AuditLogger.logAuth({
      userId: record.user_id,
      email: record.email,
      action: 'PASSWORD_RESET_COMPLETED',
      ip,
      details: { tokenId: record.id }
    });

    return { message: 'Your password has been updated. You can sign in with your new password.' };
  }
}

module.exports = AuthService;
module.exports.validatePasswordComplexity = validatePasswordComplexity;
module.exports.GENERIC_RESET_MESSAGE = GENERIC_RESET_MESSAGE;
