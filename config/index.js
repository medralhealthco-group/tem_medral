const deepFreeze = require('../utils/deepFreeze');

const site = require('./site');
const theme = require('./theme');
const seo = require('./seo');
const contacts = require('./contacts');
const offices = require('./offices');
const social = require('./social');
const navigation = require('./navigation');
const megamenu = require('./megamenu');
const redirects = require('./redirects');

const config = {
  site,
  theme,
  seo,
  contacts,
  offices,
  social,
  navigation,
  megamenu,
  redirects
};

module.exports = deepFreeze(config);
