const ContactService = require('../services/contactService');
const { getSeoMetadata } = require('../utils/seoHelper');

function wantsJson(req) {
  return Boolean(
    req.xhr ||
      (req.headers.accept && req.headers.accept.includes('application/json')) ||
      req.query.format === 'json'
  );
}

function buildMeta(req) {
  return {
    ipAddress: req.ip || req.connection?.remoteAddress || null,
    userAgent: req.get('user-agent') || null
  };
}

// POST /contact — accepts HTML forms and AJAX (enquiry modal)
exports.handleContactSubmit = async (req, res) => {
  const json = wantsJson(req);
  const source = req.body.source || (req.body.contact && req.body.contact.source) || 'contact_page';

  try {
    const result = await ContactService.submit(req.body, buildMeta(req));

    if (json) {
      return res.json({
        success: true,
        message: 'Thank you — your enquiry has been received.',
        redirect: '/pages/thank-you'
      });
    }

    return res.redirect(303, '/pages/thank-you');
  } catch (error) {
    const message = error.message || 'Unable to submit your enquiry. Please try again.';

    if (json) {
      return res.status(400).json({ success: false, message });
    }

    // Prefer returning the user to the contact page with an error for page forms
    if (source === 'home_cta') {
      return res.redirect(303, `/pages/contact?error=${encodeURIComponent(message)}`);
    }

    const seo = getSeoMetadata(
      'Contact | Medral Health Co',
      'Contact Medral Health Co for manufacturing enquiries.',
      req
    );

    return res.status(400).render('pages/contact', {
      seo,
      error: message,
      formData: req.body.contact || req.body || {}
    });
  }
};

exports.renderThankYou = (req, res) => {
  const seo = getSeoMetadata(
    'Thank You | Medral Health Co',
    'Your enquiry has been received. Our team will respond shortly.',
    req,
    { robots: 'noindex, nofollow' }
  );
  res.render('pages/thank-you', { seo });
};
