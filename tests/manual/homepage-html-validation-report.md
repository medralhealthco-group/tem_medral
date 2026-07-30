# Homepage HTML Validation Report

**Date:** 2026-07-28  
**Target:** `views/index.ejs`  
**Commit intent:** `fix(home): semantic improvements`

## Automated structure checks

| Check | Result |
|------|--------|
| doctype | PASS |
| htmlLang | PASS |
| bodyOpen | PASS |
| bodyClose | PASS |
| singleH1 | PASS |
| h1Count | 1 |
| h2Count | 12 |
| h3Count | 28 |
| skipLink | PASS |
| mainLandmark | PASS |
| noHrefHash | PASS |
| absoluteAssets | PASS |
| themeColor | PASS |
| headSeoPartial | PASS |
| webSiteLd | PASS |
| servicesKeyboard | PASS |
| telLink | PASS |
| mailto | PASS |
| formRequired | PASS |
| carouselRegion | PASS |
| noLegacyAboutHtml | PASS |
| matchedBodyTags | PASS |

**Overall:** PASS

## Audit findings → remediation

| Finding | Severity | Fix |
|---------|----------|-----|
| Missing `<body>` open tag | Critical | Added `<body>` after `</head>` |
| Multiple H1 (historical) | High | Single H1 retained; other hero slides use H2 |
| Section titles as `div` | High | Promoted to `h2` / card titles to `h3` |
| `href="#` enquiry CTAs | Medium | Replaced with `<button type="button" class="hs-cta">` |
| Click-only service cards | Medium | `role="button"`, `tabindex="0"`, keyboard handler |
| Relative `assets/` image paths | Medium | Absolute `/assets/...` paths |
| Missing skip link | Medium | Skip link to `#MainContent` |
| Weak slider labels | Low | `Previous/Next slide|brands` |
| CTA phone/email plain text | Low | `tel:` / `mailto:` links |
| Incomplete metadata | Medium | `theme-color` + existing SEO partial / WebSite JSON-LD |
| Form required attrs messy | Low | Clean `required` + autocomplete on name/email |

## Heading outline (post-fix)

1. **H1** — YOUR PRODUCT. OUR SCIENCE. (hero slide 1)
2. **H2** — remaining hero slides, Who We Are, WMUB, Certifications, Services, MOQ, Process, Why Us, Clients, As Seen On, CTA
3. **H3** — service/process/why/cert/moq/wmub item titles

## Lighthouse-oriented notes

- Landmarks: `header` (partial), `main#MainContent`, `footer` (partial)
- Contrast / paint unchanged (no visual redesign)
- Images: meaningful `alt` retained; clone strip images remain `alt=""` + `aria-hidden`
- Prefer reduced motion already respected in hero particle script

## Manual follow-ups

- [ ] Open homepage, Tab to skip link, confirm focus moves to main
- [ ] Keyboard-activate each services card (Enter/Space)
- [ ] Hero CTA buttons open enquiry modal
- [ ] Confirm layout unchanged vs pre-fix screenshots
- [ ] Optional: run Nu HTML Checker / Lighthouse Accessibility on deployed URL
