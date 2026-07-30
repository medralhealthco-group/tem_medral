#!/usr/bin/env node
/**
 * Regenerates assets/css/storefront.bundle.css from its source stylesheets.
 *
 * The storefront views load only the bundle, so any edit to a source file has no
 * effect until this script runs. Order below is the cascade order and must not be
 * reshuffled casually: tokens and resets first, then layout, components, sections.
 *
 * Usage:
 *   npm run build:css
 *   npm run build:css -- --check   (exit 1 if the bundle is stale; for CI)
 */

const fs = require('fs');
const path = require('path');

const CSS_DIR = path.join(__dirname, '..', 'assets', 'css');
const OUTPUT_FILE = path.join(CSS_DIR, 'storefront.bundle.css');
const BANNER = '/* MEDRAL HEALTH CO — UNIFIED STOREFRONT BUNDLE (v4.0 Gen-Z Crimson) */';

const SOURCES = [
  'theme.css',
  'reset.css',
  'medral-base.css',
  'extracted-styles.css',
  'product-listing.css',
  'auth.css',

  'layout/announcement-bar.css',
  'layout/topbar.css',
  'layout/nav.css',
  'layout/product-hero.css',
  'layout/mega-menu.css',
  'layout/utility-icons.css',
  'layout/nav-drawer.css',
  'layout/footer.css',
  'layout/shop-layout.css',
  'layout/product-detail.css',
  'layout/cart-layout.css',
  'layout/checkout-layout.css',
  'layout/receipt-layout.css',
  'layout/account-layout.css',

  'components/buttons.css',
  'components/cards.css',
  'components/forms.css',
  'components/alerts.css',
  'components/badges.css',
  'components/tables.css',
  'components/modals.css',
  'components/toasts.css',
  'components/hero.css',
  'components/quantity.css',
  'components/cart-drawer.css',
  'components/search-modal.css',

  'sections/who-we-are.css',
  'sections/about-us.css',
  'sections/what-makes-us-better.css',
  'sections/mission-statement.css'
];

function buildBundle() {
  const missing = SOURCES.filter(rel => !fs.existsSync(path.join(CSS_DIR, rel)));
  if (missing.length > 0) {
    throw new Error(`Missing source stylesheet(s):\n  ${missing.join('\n  ')}`);
  }

  const sections = SOURCES.map(rel => {
    const raw = fs.readFileSync(path.join(CSS_DIR, rel), 'utf8');
    const body = raw.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').trim();
    return `/* === Start: ${rel} === */\n${body}\n/* === End: ${rel} === */`;
  });

  return `${BANNER}\n\n\n${sections.join('\n\n')}\n`;
}

function main() {
  const checkOnly = process.argv.includes('--check');
  const bundle = buildBundle();
  const current = fs.existsSync(OUTPUT_FILE)
    ? fs.readFileSync(OUTPUT_FILE, 'utf8').replace(/\r\n/g, '\n')
    : null;

  if (checkOnly) {
    if (bundle !== current) {
      console.error('storefront.bundle.css is out of date. Run: npm run build:css');
      process.exit(1);
    }
    console.log('storefront.bundle.css is up to date.');
    return;
  }

  fs.writeFileSync(OUTPUT_FILE, bundle, 'utf8');

  const sizeKb = (Buffer.byteLength(bundle, 'utf8') / 1024).toFixed(1);
  console.log(`Bundled ${SOURCES.length} stylesheets into storefront.bundle.css (${sizeKb} KB)`);
}

main();
