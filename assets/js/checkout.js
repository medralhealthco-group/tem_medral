/**
 * Checkout form live validation — mirrors utils/checkoutValidation.js
 */
(function () {
  var form = document.getElementById('checkoutForm');
  if (!form) return;

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  var NAME_RE = /^[A-Za-z][A-Za-z .'-]{1,79}$/;
  var CITY_STATE_RE = /^[A-Za-z][A-Za-z .'-]{1,59}$/;
  var PINCODE_RE = /^[1-9][0-9]{5}$/;

  var MESSAGES = {
    name: 'Enter a valid full name (letters only, at least 2 characters).',
    email: 'Enter a valid email address.',
    phone: 'Enter a valid 10-digit Indian mobile number (starts with 6–9).',
    address: 'Enter a complete street address (at least 10 characters).',
    city: 'Enter a valid city name (letters only, at least 2 characters).',
    state: 'Enter a valid state name (letters only, at least 2 characters).',
    pincode: 'Enter a valid 6-digit Indian PIN code.'
  };

  var fields = ['name', 'email', 'phone', 'address', 'city', 'state', 'pincode'];
  var touched = {};

  function normalizeIndianMobile(raw) {
    var digits = String(raw || '').replace(/\D/g, '');
    if (digits.indexOf('91') === 0 && digits.length === 12) digits = digits.slice(2);
    else if (digits.charAt(0) === '0' && digits.length === 11) digits = digits.slice(1);
    return /^[6-9]\d{9}$/.test(digits) ? digits : null;
  }

  function valueOf(id) {
    var el = document.getElementById(id);
    return el ? String(el.value || '').trim() : '';
  }

  function validateField(id) {
    var value = valueOf(id);
    if (id === 'name') return NAME_RE.test(value) ? '' : MESSAGES.name;
    if (id === 'email') {
      return value && value.length <= 120 && EMAIL_RE.test(value.toLowerCase())
        ? ''
        : MESSAGES.email;
    }
    if (id === 'phone') return normalizeIndianMobile(value) ? '' : MESSAGES.phone;
    if (id === 'address') {
      return value.length >= 10 && value.length <= 200 ? '' : MESSAGES.address;
    }
    if (id === 'city') return CITY_STATE_RE.test(value) ? '' : MESSAGES.city;
    if (id === 'state') return CITY_STATE_RE.test(value) ? '' : MESSAGES.state;
    if (id === 'pincode') {
      return PINCODE_RE.test(value.replace(/\s/g, '')) ? '' : MESSAGES.pincode;
    }
    return '';
  }

  function setFieldState(id, message) {
    var input = document.getElementById(id);
    var err = document.getElementById(id + '-error');
    if (!input) return;
    if (message) {
      input.classList.add('is-invalid');
      input.setAttribute('aria-invalid', 'true');
      if (err) {
        err.textContent = message;
        err.hidden = false;
      }
    } else {
      input.classList.remove('is-invalid');
      input.removeAttribute('aria-invalid');
      if (err) {
        err.textContent = '';
        err.hidden = true;
      }
    }
  }

  function validateAll(showUntouched) {
    var firstInvalid = null;
    fields.forEach(function (id) {
      if (!showUntouched && !touched[id]) return;
      var msg = validateField(id);
      setFieldState(id, msg);
      if (msg && !firstInvalid) firstInvalid = id;
    });
    return firstInvalid;
  }

  fields.forEach(function (id) {
    var input = document.getElementById(id);
    if (!input) return;
    input.addEventListener('blur', function () {
      touched[id] = true;
      setFieldState(id, validateField(id));
    });
    input.addEventListener('input', function () {
      if (!touched[id]) return;
      setFieldState(id, validateField(id));
    });
  });

  form.addEventListener('submit', function (e) {
    fields.forEach(function (id) {
      touched[id] = true;
    });
    var firstInvalid = validateAll(true);
    if (firstInvalid) {
      e.preventDefault();
      var el = document.getElementById(firstInvalid);
      if (el) el.focus();
    }
  });
})();
