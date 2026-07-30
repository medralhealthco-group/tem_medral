# SEO Remediation Report — Phase 5

**Commit intent:** `seo: production optimization`  
**Date:** 2026-07-28  
**Scope:** Storefront SEO only (UI preserved)

## Score impact (est.)

| Area | Before | After |
|------|--------|-------|
| Overall SEO (audit) | **55** | **~82–88** (pending live crawl) |
| Canonicals | Broken / relative on many pages | Absolute via `SITE_URL` / production origin |
| Social meta | Partial (shop only) | Canonical + full OG + Twitter sitewide |
| Index control | Incomplete | robots.txt + page `noindex` for private flows |
| Structured data | Relative product images; weak home | Absolute Product/Breadcrumb; WebSite+SearchAction on home |

## Fixes delivered

### Canonicals
- `utils/seoHelper.js` now builds absolute canonicals from `SITE_URL` / `APP_URL`, else production `config.site.website`, else request host (dev).
- Legacy relative `*.html` canonicals removed from contact, FAQs, certifications, privacy, terms, B2B.
- Shared partial: `views/partials/head-seo.ejs`.

### Open Graph & Twitter
- Full OG set (`title`, `description`, `url`, `image`, `type`, `site_name`) on storefront pages via head partial.
- Twitter `summary_large_image` + `twitter:site` (`@medral` from `config/seo.js`).
- Product pages pass real product image into OG/Twitter.

### Home metadata
- Strengthened title/description in `pageController.renderHome`.
- Complete social tags + `WebSite` JSON-LD with shop `SearchAction`.

### Single H1
- Home hero: **1× H1** (slides 2–3 demoted to `h2`, same classes — visual unchanged).
- Terms body CMS heading demoted `h1` → `h2`.

### Robots
- Dynamic `/robots.txt`: Allow `/`, Disallow admin/cart/checkout/account/thank-you, absolute Sitemap.
- Page-level `noindex,nofollow` for cart, checkout, account, orders, thank-you.
- 404/errors: `noindex, follow`.
- Orphan root `robots.txt` updated to document live endpoint.

### Sitemap
- Uses same production base origin helper.
- Product sitemap paginates (200/page, up to 50 pages) — no hard 1000 cut-off.
- XML escaping for locs.

### Structured data
- Organization (header) uses `seo.siteOrigin`.
- Product schema images absolutized.
- BreadcrumbList uses `seo.siteOrigin` (shop/category/product).
- Home `WebSite` + `SearchAction`.

### Relative URL issues
- Canonical/OG/Twitter/schema/sitemap locs are absolute.
- Legacy page asset hrefs `../assets/...` → `/assets/...` (head CSS/favicon).

### Missing descriptions
- Page-specific descriptions in `PAGE_SEO` map (`pageController`).
- FAQs no longer emits `"Loading..."`.
- Dosage-form + products-by-forms use controller `seo` object.
- Cart/checkout/account include descriptions via head partial.

## Config

Add to production `.env`:

```env
SITE_URL=https://www.medralhealth.com
```

(Also documented in `.env.example`.)

## Manual verification checklist

- [ ] View-source `/` — one H1; full OG/Twitter; WebSite JSON-LD; absolute canonical
- [ ] View-source `/pages/contact` — absolute canonical (not `contact.html`); description present
- [ ] View-source `/pages/faqs` — description is real copy (not Loading...)
- [ ] View-source `/shop/product/<slug>` — `og:image` is product upload URL (absolute)
- [ ] `GET /robots.txt` — absolute Sitemap line; private paths disallowed
- [ ] `GET /sitemap.xml` (+ main/categories/products) — `https://www.medralhealth.com/...` locs in production
- [ ] Cart/checkout — `robots: noindex, nofollow`
- [ ] 404 — `noindex`
- [ ] Google Rich Results / Schema Markup Validator on home + product URL
- [ ] Visual spot-check: home slider, shop, contact, cart still styled (CSS intact)

## Residual / next (optional)

- FAQPage JSON-LD on FAQs (content-heavy; deferred)
- Blog article pages currently redirect to news index
- Submit sitemap in Google Search Console after deploy
- Align Twitter handle if `@medral` is not the live account
