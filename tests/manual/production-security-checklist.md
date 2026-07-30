# Production security hardening checklist

**Commit:** `security: production hardening`  
**Date:** 2026-07-28

## Automated / code controls

- [x] CSP per-request nonces on `<script>` / `<style>` elements
- [x] Removed `'unsafe-inline'` from `script-src` / `script-src-elem` and `style-src` / `style-src-elem`
- [x] Narrow `script-src-attr` / `style-src-attr` only for legacy HTML attributes (`onclick`, `style=""`)
- [x] Helmet hardened (COOP, CORP, HSTS prod, frameguard, hidePoweredBy, referrer, permissions via extra header)
- [x] CSRF never accepted from query string (body/headers only)
- [x] CSRF compared with `crypto.timingSafeEqual`
- [x] `X-Powered-By` disabled / stripped
- [x] Public `/health` returns only `{ status }` (no env/memory/version)
- [x] Detailed health behind `X-Health-Token: $HEALTH_TOKEN`
- [x] Production refuses missing `SESSION_SECRET` (also enforced in `envValidator`)
- [x] Error pages do not leak stack traces; message only in non-production

## Manual verification

- [ ] `curl -I https://www.medralhealth.com/` — CSP contains `nonce-…`, no `script-src 'unsafe-inline'`
- [ ] Homepage scripts still run (hero slider, enquiry modal, footer)
- [ ] Browser console: no CSP violations on critical pages (home, shop, cart, login)
- [ ] `curl https://…/health` → `{"status":"ok"}` only
- [ ] `curl -H "X-Health-Token: $HEALTH_TOKEN" https://…/health` → diagnostics when token set
- [ ] POST with `?_csrf=…` only (no body/header token) → 403
- [ ] POST with valid body `_csrf` → succeeds
- [ ] Response headers include `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, no `X-Powered-By`
- [ ] Production `NODE_ENV=production` without `SESSION_SECRET` → process exits
- [ ] HSTS present on HTTPS production responses

## Residual risk (documented)

- `script-src-attr 'unsafe-inline'` remains until inline event handlers (`onclick`) are migrated to external listeners
- `style-src-attr 'unsafe-inline'` remains for widespread `style=""` attributes
- Migrate handlers/styles over time to drop attr exceptions entirely
