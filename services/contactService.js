const ContactModel = require('../models/contactModel');
const { sendContactNotification } = require('./emailService');
const logger = require('../utils/logger');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ALLOWED_SOURCES = new Set(['contact_page', 'enquiry_modal', 'home_cta']);

function pickField(body, key) {
  if (body && body.contact && typeof body.contact === 'object' && body.contact[key] != null) {
    return body.contact[key];
  }
  return body ? body[key] : undefined;
}

function normalizePayload(body = {}) {
  const newsletterRaw = pickField(body, 'newsletter');
  return {
    name: String(pickField(body, 'name') || '').trim(),
    email: String(pickField(body, 'email') || '')
      .trim()
      .toLowerCase(),
    phone: String(pickField(body, 'phone') || '').trim(),
    company: String(pickField(body, 'company') || '').trim(),
    service: String(pickField(body, 'service') || '').trim(),
    productCategory: String(
      pickField(body, 'product_category') || pickField(body, 'productCategory') || ''
    ).trim(),
    quantity: String(pickField(body, 'quantity') || '').trim(),
    message: String(pickField(body, 'body') || pickField(body, 'message') || '').trim(),
    newsletter: newsletterRaw === 'yes' || newsletterRaw === '1' || newsletterRaw === true,
    source: String(body.source || pickField(body, 'source') || 'contact_page').trim(),
    // Honeypot fields — must remain empty for humans
    honeypot: String(body.website || body.company_url || pickField(body, 'website') || '').trim()
  };
}

function validateContact(data, { requirePhone = false, requireMessage = false } = {}) {
  if (!data.name || data.name.length < 2) {
    throw new Error('Please enter your full name.');
  }
  if (data.name.length > 150) {
    throw new Error('Name is too long.');
  }
  if (!data.email || !EMAIL_RE.test(data.email)) {
    throw new Error('Please enter a valid email address.');
  }
  if (data.email.length > 255) {
    throw new Error('Email is too long.');
  }
  if (requirePhone && !data.phone) {
    throw new Error('Please enter your phone or WhatsApp number.');
  }
  if (data.phone && data.phone.length > 40) {
    throw new Error('Phone number is too long.');
  }
  if (requireMessage && !data.message) {
    throw new Error('Please describe your requirement.');
  }
  if (data.message && data.message.length > 5000) {
    throw new Error('Message is too long.');
  }
  if (data.company && data.company.length > 200) {
    throw new Error('Company name is too long.');
  }
  if (!ALLOWED_SOURCES.has(data.source)) {
    data.source = 'contact_page';
  }
}

class ContactService {
  static async submit(body, meta = {}) {
    const data = normalizePayload(body);

    // Silent honeypot acceptance — do not tip off bots
    if (data.honeypot) {
      logger.warn('[CONTACT] Honeypot triggered — submission discarded', {
        ip: meta.ipAddress,
        source: data.source
      });
      return { id: null, spam: true };
    }

    const requirePhone = data.source === 'enquiry_modal' || data.source === 'contact_page';
    const requireMessage = data.source === 'contact_page';
    validateContact(data, { requirePhone, requireMessage });

    const submission = {
      ...data,
      ipAddress: meta.ipAddress || null,
      userAgent: meta.userAgent ? String(meta.userAgent).slice(0, 500) : null,
      emailSent: false
    };

    const id = await ContactModel.createSubmission(submission);
    submission.id = id;

    try {
      const emailed = await sendContactNotification(submission);
      if (emailed) {
        await ContactModel.markEmailSent(id, true);
        submission.emailSent = true;
      }
    } catch (err) {
      logger.error('[CONTACT] Notification email failed', {
        submissionId: id,
        error: err.message
      });
    }

    return { id, spam: false, submission };
  }
}

module.exports = ContactService;
