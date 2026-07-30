# Upload security — attack test checklist

Use against a local/staging admin session. Expected result for each attack: **reject** (400/validation error), **no executable file left on disk**, and **no DB row** for rejected uploads.

## Spoofing & content

- [ ] Upload `shell.php.jpg` (PHP payload + `.jpg` extension) → rejected by magic bytes / dangerous double-ext filter
- [ ] Upload JPEG-named file with PNG magic bytes → accepted only if content is PNG; stored as `.png`
- [ ] Upload text file renamed to `.png` → rejected (no PNG magic)
- [ ] Upload SVG renamed to `.png` → rejected
- [ ] Upload WebP polyglot / truncated header → rejected
- [ ] Upload empty file as `.jpg` → rejected

## MIME & extension

- [ ] `Content-Type: image/jpeg` with `.exe` filename → rejected by extension filter
- [ ] `Content-Type: application/octet-stream` with valid `.jpg` → rejected by MIME filter
- [ ] `Content-Type: image/jpeg` with `.php` → rejected
- [ ] Double extension `photo.php.jpg` → rejected
- [ ] Allowed: real `.jpg` / `.jpeg` / `.png` / `.webp` with matching MIME → accepted

## Size & count

- [ ] File > 5MB → rejected (`LIMIT_FILE_SIZE` / size check)
- [ ] Exactly 5MB valid image → accepted
- [ ] More than 5 files in one request → rejected (`LIMIT_FILE_COUNT`)

## Filename / path

- [ ] Original name `../../evil.jpg` → stored under `public/uploads/` only; no path traversal
- [ ] Stored name matches `product-<timestamp>-<32hex>.(jpg|png|webp)` (no client-controlled basename)
- [ ] `GET /uploads/` directory listing → denied / empty (no index)

## Orphan cleanup

- [ ] Valid upload then force create/update validation failure → temp files removed from `public/uploads`
- [ ] Delete single product image in admin → DB row gone **and** file unlinked
- [ ] Delete product → all gallery files unlinked
- [ ] Rejected magic-byte upload → no leftover file in `public/uploads`

## Cache & headers

- [ ] `GET /uploads/<file>` → `Cache-Control: public, max-age=86400, must-revalidate` (not `immutable`)
- [ ] Response includes `X-Content-Type-Options: nosniff`
- [ ] Dotfile request `/uploads/.htaccess` or `/uploads/.gitkeep` → denied or not served as app content

## Auth & surface

- [ ] Unauthenticated `POST /admin/products/create` with multipart → redirected / blocked (admin auth)
- [ ] Upload field name remains `images` (UX unchanged)
- [ ] Happy path: create/edit product with 1–5 real images still works as before
