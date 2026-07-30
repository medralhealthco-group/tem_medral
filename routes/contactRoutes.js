const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');
const { contactLimiter } = require('../middlewares/securityMiddleware');

router.post('/contact', contactLimiter, contactController.handleContactSubmit);
router.get('/pages/thank-you', contactController.renderThankYou);

module.exports = router;
