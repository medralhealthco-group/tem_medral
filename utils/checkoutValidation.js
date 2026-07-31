/**
 * Checkout shipping / contact validation.
 * Shared rules for server-side rejection; client mirrors these messages.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_RE = /^[A-Za-z][A-Za-z .'-]{1,79}$/;
const CITY_STATE_RE = /^[A-Za-z][A-Za-z .'-]{1,59}$/;
const PINCODE_RE = /^[1-9][0-9]{5}$/;
const ALLOWED_PAYMENT = new Set(['cod', 'bank_transfer']);

const MESSAGES = {
  name: 'Enter a valid full name (letters only, at least 2 characters).',
  email: 'Enter a valid email address.',
  phone: 'Enter a valid 10-digit Indian mobile number (starts with 6–9).',
  address: 'Enter a complete street address (at least 10 characters).',
  city: 'Enter a valid city name (letters only, at least 2 characters).',
  state: 'Enter a valid state name (letters only, at least 2 characters).',
  pincode: 'Enter a valid 6-digit Indian PIN code.',
  payment_method: 'Select a valid payment method.'
};

function str(value) {
  return String(value == null ? '' : value).trim();
}

/** Normalize to 10-digit Indian mobile, or null if invalid. */
function normalizeIndianMobile(raw) {
  let digits = String(raw || '').replace(/\D/g, '');
  if (digits.startsWith('91') && digits.length === 12) {
    digits = digits.slice(2);
  } else if (digits.startsWith('0') && digits.length === 11) {
    digits = digits.slice(1);
  }
  if (/^[6-9]\d{9}$/.test(digits)) return digits;
  return null;
}

/**
 * @param {object} body
 * @returns {{ ok: true, data: object } | { ok: false, errors: Record<string,string>, message: string }}
 */
function validateCheckoutFields(body = {}) {
  const errors = {};

  const name = str(body.name);
  const email = str(body.email).toLowerCase();
  const phoneRaw = str(body.phone);
  const address = str(body.address);
  const city = str(body.city);
  const state = str(body.state);
  const pincode = str(body.pincode).replace(/\s/g, '');
  const paymentMethod = str(body.payment_method || body.paymentMethod || 'cod').toLowerCase();

  if (!NAME_RE.test(name)) errors.name = MESSAGES.name;
  if (!email || email.length > 120 || !EMAIL_RE.test(email)) errors.email = MESSAGES.email;

  const phone = normalizeIndianMobile(phoneRaw);
  if (!phone) errors.phone = MESSAGES.phone;

  if (address.length < 10 || address.length > 200) errors.address = MESSAGES.address;
  if (!CITY_STATE_RE.test(city)) errors.city = MESSAGES.city;
  if (!CITY_STATE_RE.test(state)) errors.state = MESSAGES.state;
  if (!PINCODE_RE.test(pincode)) errors.pincode = MESSAGES.pincode;
  if (!ALLOWED_PAYMENT.has(paymentMethod)) errors.payment_method = MESSAGES.payment_method;

  if (Object.keys(errors).length > 0) {
    const firstKey = Object.keys(errors)[0];
    return {
      ok: false,
      errors,
      message: errors[firstKey],
      formData: {
        name,
        email: str(body.email),
        phone: phoneRaw,
        address,
        city,
        state,
        pincode: str(body.pincode),
        payment_method: ALLOWED_PAYMENT.has(paymentMethod) ? paymentMethod : 'cod'
      }
    };
  }

  return {
    ok: true,
    data: {
      name,
      email,
      phone,
      address,
      city,
      state,
      pincode,
      payment_method: paymentMethod
    }
  };
}

module.exports = {
  validateCheckoutFields,
  normalizeIndianMobile,
  MESSAGES
};
