# Phase 9 — Codebase cleanup report

**Commit:** `refactor: remove dead code`  
**Date:** 2026-07-28  
**Rule:** Only high-confidence unused assets/files removed. Live homepage section IDs, routes, and active CSS/JS kept.

## Removed

### Shopify dump / demos
| Path | Reason |
|------|--------|
| `demoany.html` (~1.2MB) | Full YourHappyLife Shopify HTML export; not routed |
| `files/preloads.js` | Shopify checkout CDN preloader |
| `files/loader.init-shop-cart-sync.en.esm.js` | Shopify Shop Pay stub |
| `files/` (directory) | Emptied and removed; `/files` static mount dropped from `server.js` |
| `views/blogs/news.atom` | Shopify Atom feed; no route serves it |

### Unused CSS
| Path | Reason |
|------|--------|
| `assets/css/styles.css` (~342KB) | Prestige/Shopify theme CSS; never linked (bundle is `storefront.bundle.css`) |
| `assets/css/tokens.css` | Superseded by `theme.css` / `tokens-v3.css` |
| `assets/css/storefront.entry.css` | Old entry file; build uses `scripts/build-css.js` |
| `assets/css/admin.entry.css` | Unused; admin loads `admin-base.css` |

### Unused JS / HTML includes
| Path | Reason |
|------|--------|
| `assets/js/cart.min.js` | Views load `cart.js` only |
| `assets/js/medral-global.min.js` | Views load `medral-global.js` only |
| `assets/includes/header.html` | Superseded by EJS partials |
| `assets/includes/footer.html` | Superseded by EJS partials |

### Orphan images (unreferenced)
`2.jpg`, `5.jpg`, `63.png`, Shopify-hash PNG, Instagram dump JPG, `ANS.png`, `TOI.png`, `Nutro_Logo.png`, `Nutro_Reception.jpg`, `Tejasvi.jpg`, orphan avatar, `faviconbgrem.png`

## Light remnant cleanup (kept pages)
- Privacy policy: removed “We use Shopify to power our online store”
- Homepage: renamed `shopifySectionElement` → `sectionElement`
- Certifications: removed “Liquid” comment wording
- `medral-global.js`: stripped Shopify CDN `sourceMappingURL`

## Explicitly kept (active)
- Homepage `section-template--20946532663474__*` IDs (wired to CSS/JS)
- `extracted-styles.css`, `storefront.bundle.css`, `fonts.css`, layout/component CSS in `build-css.js`
- `cart.js`, `header.js`, `medral-global.js`
- All Express routes/controllers
- `coming-soon.ejs` (env-gated)

## Residual / optional later
- Migrate remaining inline `onclick` / `style=""` for stricter CSP
- Prune unused logo-strip selectors inside `extracted-styles.css` (large file; selective)
- Deduplicate enquiry-modal helpers between footer inline script and `medral-global.js` after confirming call sites
