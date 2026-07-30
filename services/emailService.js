const nodemailer = require('nodemailer');
const logger = require('../utils/logger');
const config = require('../config');

let transporter = null;

function isSmtpConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_FROM);
}

function getTransporter() {
  if (!isSmtpConfigured()) return null;
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          }
        : undefined
  });

  return transporter;
}

async function sendMail({ to, subject, text, html, replyTo }) {
  const mailer = getTransporter();
  if (!mailer) {
    logger.warn('[EMAIL] SMTP not configured — message not sent', { to, subject });
    return false;
  }

  await mailer.sendMail({
    from: process.env.SMTP_FROM,
    to,
    replyTo: replyTo || undefined,
    subject,
    text,
    html: html || undefined
  });

  return true;
}

async function sendContactNotification(submission) {
  const notifyTo = process.env.CONTACT_NOTIFY_TO || config.contacts.primaryEmail;

  if (!isSmtpConfigured()) {
    logger.warn('[EMAIL] SMTP not configured — contact saved to database only', {
      submissionId: submission.id,
      email: submission.email
    });
    return false;
  }

  const subject = `[Medral Lead] ${submission.source || 'contact'} — ${submission.name}`;
  const text = [
    `New contact enquiry (#${submission.id})`,
    '',
    `Name: ${submission.name}`,
    `Email: ${submission.email}`,
    `Phone: ${submission.phone || '-'}`,
    `Company: ${submission.company || '-'}`,
    `Service: ${submission.service || '-'}`,
    `Product category: ${submission.productCategory || '-'}`,
    `Quantity: ${submission.quantity || '-'}`,
    `Newsletter: ${submission.newsletter ? 'yes' : 'no'}`,
    `Source: ${submission.source || '-'}`,
    `IP: ${submission.ipAddress || '-'}`,
    '',
    'Message:',
    submission.message || '(none)'
  ].join('\n');

  return sendMail({
    to: notifyTo,
    replyTo: submission.email,
    subject,
    text
  });
}

async function sendPasswordResetEmail({ to, firstName, resetUrl, expiresInMinutes }) {
  const name = firstName || 'there';
  const minutes = expiresInMinutes || 60;
  const subject = 'Reset your Medral Health password';
  const text = [
    `Hi ${name},`,
    '',
    'We received a request to reset the password for your Medral Health account.',
    'Use the link below to choose a new password:',
    '',
    resetUrl,
    '',
    `This link expires in ${minutes} minutes and can only be used once.`,
    '',
    'If you did not request a password reset, you can ignore this email — your password will stay the same.',
    '',
    '— Medral Health Co'
  ].join('\n');

  const html = [
    `<p>Hi ${name},</p>`,
    '<p>We received a request to reset the password for your Medral Health account.</p>',
    `<p><a href="${resetUrl}">Reset your password</a></p>`,
    `<p>This link expires in <strong>${minutes} minutes</strong> and can only be used once.</p>`,
    '<p>If you did not request a password reset, you can ignore this email.</p>',
    '<p>— Medral Health Co</p>'
  ].join('\n');

  const sent = await sendMail({ to, subject, text, html });
  if (!sent && process.env.NODE_ENV !== 'production') {
    logger.info('[EMAIL] Password reset link (SMTP unset, dev only)', { to, resetUrl });
  }
  return sent;
}

module.exports = {
  isSmtpConfigured,
  sendMail,
  sendContactNotification,
  sendPasswordResetEmail
};
