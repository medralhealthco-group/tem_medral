-- =============================================================================
-- Medral Health Co — Hybrid Catalog Seed (go-live)
-- =============================================================================
-- Categories (exact slugs required by config/megamenu.js) plus the full
-- Skin / Hair / Lifestyle header product set, and By Product placeholders.
--
-- Prerequisites: import database/schema.sql first.
-- Safe to re-run: skips rows whose slug/sku already exists.
--
-- Import order on Hostinger phpMyAdmin:
--   1. schema.sql
--   2. seed.sql          (optional legacy admin hash cleanup)
--   3. seed-catalog.sql  (this file)
--
-- Refine prices, copy, and real images later via /admin.
-- created_at values control mega-menu order (newest first within category).
-- =============================================================================

SET NAMES utf8mb4;

-- -----------------------------------------------------------------------------
-- Categories (By Concern + By Product tabs)
-- -----------------------------------------------------------------------------
INSERT INTO `categories` (`name`, `slug`, `description`, `image_url`, `is_active`, `display_order`)
SELECT 'Skin', 'skin', 'Skin health and beauty supplements.', NULL, 1, 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `categories` WHERE `slug` = 'skin');

INSERT INTO `categories` (`name`, `slug`, `description`, `image_url`, `is_active`, `display_order`)
SELECT 'Hair', 'hair', 'Hair growth and scalp support supplements.', NULL, 1, 2
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `categories` WHERE `slug` = 'hair');

INSERT INTO `categories` (`name`, `slug`, `description`, `image_url`, `is_active`, `display_order`)
SELECT 'Lifestyle', 'lifestyle', 'Everyday wellness and lifestyle supplements.', NULL, 1, 3
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `categories` WHERE `slug` = 'lifestyle');

INSERT INTO `categories` (`name`, `slug`, `description`, `image_url`, `is_active`, `display_order`)
SELECT 'Collagen', 'collagen', 'Collagen formulas.', NULL, 1, 4
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `categories` WHERE `slug` = 'collagen');

INSERT INTO `categories` (`name`, `slug`, `description`, `image_url`, `is_active`, `display_order`)
SELECT 'Capsules', 'capsules', 'Capsule product line.', NULL, 1, 5
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `categories` WHERE `slug` = 'capsules');

-- -----------------------------------------------------------------------------
-- Published header products — placeholder price 999.00
-- -----------------------------------------------------------------------------

-- Skin (display order 1→4 via created_at DESC)
INSERT INTO `products` (
  `category_id`, `subcategory_id`, `title`, `slug`, `sku`, `brand`,
  `short_description`, `full_description`, `price`, `sale_price`,
  `stock_quantity`, `status`, `is_featured`, `created_at`
)
SELECT
  c.`id`, NULL,
  'L-Glutathione Capsules', 'l-glutathione-capsules', 'SKIN-GLUT-001', 'Medral Health',
  'Antioxidant support for skin clarity.',
  'Placeholder product for go-live. Replace description and imagery in Admin.',
  999.00, NULL, 100, 'published', 1, '2026-01-04 12:00:00'
FROM `categories` c
WHERE c.`slug` = 'skin'
  AND NOT EXISTS (SELECT 1 FROM `products` WHERE `slug` = 'l-glutathione-capsules')
  AND NOT EXISTS (SELECT 1 FROM `products` WHERE `sku` = 'SKIN-GLUT-001');

INSERT INTO `products` (
  `category_id`, `subcategory_id`, `title`, `slug`, `sku`, `brand`,
  `short_description`, `full_description`, `price`, `sale_price`,
  `stock_quantity`, `status`, `is_featured`, `created_at`
)
SELECT
  c.`id`, NULL,
  'Marine Collagen (powder)', 'marine-collagen-powder', 'SKIN-MCP-001', 'Medral Health',
  'Marine collagen powder for skin support.',
  'Placeholder product for go-live. Replace description and imagery in Admin.',
  999.00, NULL, 100, 'published', 0, '2026-01-03 12:00:00'
FROM `categories` c
WHERE c.`slug` = 'skin'
  AND NOT EXISTS (SELECT 1 FROM `products` WHERE `slug` = 'marine-collagen-powder')
  AND NOT EXISTS (SELECT 1 FROM `products` WHERE `sku` = 'SKIN-MCP-001');

INSERT INTO `products` (
  `category_id`, `subcategory_id`, `title`, `slug`, `sku`, `brand`,
  `short_description`, `full_description`, `price`, `sale_price`,
  `stock_quantity`, `status`, `is_featured`, `created_at`
)
SELECT
  c.`id`, NULL,
  'Hydrogel Eye Patches', 'hydrogel-eye-patches', 'SKIN-EYE-001', 'Medral Health',
  'Hydrogel eye patches for under-eye care.',
  'Placeholder product for go-live. Replace description and imagery in Admin.',
  999.00, NULL, 100, 'published', 0, '2026-01-02 12:00:00'
FROM `categories` c
WHERE c.`slug` = 'skin'
  AND NOT EXISTS (SELECT 1 FROM `products` WHERE `slug` = 'hydrogel-eye-patches')
  AND NOT EXISTS (SELECT 1 FROM `products` WHERE `sku` = 'SKIN-EYE-001');

INSERT INTO `products` (
  `category_id`, `subcategory_id`, `title`, `slug`, `sku`, `brand`,
  `short_description`, `full_description`, `price`, `sale_price`,
  `stock_quantity`, `status`, `is_featured`, `created_at`
)
SELECT
  c.`id`, NULL,
  'Marine Collagen (Unflavoured) powder', 'marine-collagen-unflavoured-powder', 'SKIN-MCU-001', 'Medral Health',
  'Unflavoured marine collagen powder.',
  'Placeholder product for go-live. Replace description and imagery in Admin.',
  999.00, NULL, 100, 'published', 0, '2026-01-01 12:00:00'
FROM `categories` c
WHERE c.`slug` = 'skin'
  AND NOT EXISTS (SELECT 1 FROM `products` WHERE `slug` = 'marine-collagen-unflavoured-powder')
  AND NOT EXISTS (SELECT 1 FROM `products` WHERE `sku` = 'SKIN-MCU-001');

-- Hair
INSERT INTO `products` (
  `category_id`, `subcategory_id`, `title`, `slug`, `sku`, `brand`,
  `short_description`, `full_description`, `price`, `sale_price`,
  `stock_quantity`, `status`, `is_featured`, `created_at`
)
SELECT
  c.`id`, NULL,
  'Hair Growth with Biotin Capsules', 'hair-growth-with-biotin-capsules', 'HAIR-BIOT-001', 'Medral Health',
  'Biotin support for hair growth.',
  'Placeholder product for go-live. Replace description and imagery in Admin.',
  999.00, NULL, 100, 'published', 1, '2026-01-04 12:00:00'
FROM `categories` c
WHERE c.`slug` = 'hair'
  AND NOT EXISTS (SELECT 1 FROM `products` WHERE `slug` = 'hair-growth-with-biotin-capsules')
  AND NOT EXISTS (SELECT 1 FROM `products` WHERE `sku` = 'HAIR-BIOT-001');

-- Lifestyle (display order 1→5 via created_at DESC)
INSERT INTO `products` (
  `category_id`, `subcategory_id`, `title`, `slug`, `sku`, `brand`,
  `short_description`, `full_description`, `price`, `sale_price`,
  `stock_quantity`, `status`, `is_featured`, `created_at`
)
SELECT
  c.`id`, NULL,
  'Omega 3 with Astaxanthin', 'omega-3-with-astaxanthin', 'LIFE-OM3-001', 'Medral Health',
  'Omega-3 with astaxanthin for everyday wellness.',
  'Placeholder product for go-live. Replace description and imagery in Admin.',
  999.00, NULL, 100, 'published', 1, '2026-01-05 12:00:00'
FROM `categories` c
WHERE c.`slug` = 'lifestyle'
  AND NOT EXISTS (SELECT 1 FROM `products` WHERE `slug` = 'omega-3-with-astaxanthin')
  AND NOT EXISTS (SELECT 1 FROM `products` WHERE `sku` = 'LIFE-OM3-001');

INSERT INTO `products` (
  `category_id`, `subcategory_id`, `title`, `slug`, `sku`, `brand`,
  `short_description`, `full_description`, `price`, `sale_price`,
  `stock_quantity`, `status`, `is_featured`, `created_at`
)
SELECT
  c.`id`, NULL,
  'Magnesium with D3, K2 & Zinc', 'magnesium-with-d3-k2-zinc', 'LIFE-MAG-001', 'Medral Health',
  'Magnesium with vitamin D3, K2, and zinc.',
  'Placeholder product for go-live. Replace description and imagery in Admin.',
  999.00, NULL, 100, 'published', 0, '2026-01-04 12:00:00'
FROM `categories` c
WHERE c.`slug` = 'lifestyle'
  AND NOT EXISTS (SELECT 1 FROM `products` WHERE `slug` = 'magnesium-with-d3-k2-zinc')
  AND NOT EXISTS (SELECT 1 FROM `products` WHERE `sku` = 'LIFE-MAG-001');

INSERT INTO `products` (
  `category_id`, `subcategory_id`, `title`, `slug`, `sku`, `brand`,
  `short_description`, `full_description`, `price`, `sale_price`,
  `stock_quantity`, `status`, `is_featured`, `created_at`
)
SELECT
  c.`id`, NULL,
  'Lung & Liver Detox Capsules', 'lung-liver-detox-capsules', 'LIFE-DET-001', 'Medral Health',
  'Lung and liver detox support capsules.',
  'Placeholder product for go-live. Replace description and imagery in Admin.',
  999.00, NULL, 100, 'published', 0, '2026-01-03 12:00:00'
FROM `categories` c
WHERE c.`slug` = 'lifestyle'
  AND NOT EXISTS (SELECT 1 FROM `products` WHERE `slug` = 'lung-liver-detox-capsules')
  AND NOT EXISTS (SELECT 1 FROM `products` WHERE `sku` = 'LIFE-DET-001');

INSERT INTO `products` (
  `category_id`, `subcategory_id`, `title`, `slug`, `sku`, `brand`,
  `short_description`, `full_description`, `price`, `sale_price`,
  `stock_quantity`, `status`, `is_featured`, `created_at`
)
SELECT
  c.`id`, NULL,
  'Testosterone Booster Capsules for Men', 'testosterone-booster-capsules-for-men', 'LIFE-TEST-001', 'Medral Health',
  'Testosterone support capsules for men.',
  'Placeholder product for go-live. Replace description and imagery in Admin.',
  999.00, NULL, 100, 'published', 0, '2026-01-02 12:00:00'
FROM `categories` c
WHERE c.`slug` = 'lifestyle'
  AND NOT EXISTS (SELECT 1 FROM `products` WHERE `slug` = 'testosterone-booster-capsules-for-men')
  AND NOT EXISTS (SELECT 1 FROM `products` WHERE `sku` = 'LIFE-TEST-001');

INSERT INTO `products` (
  `category_id`, `subcategory_id`, `title`, `slug`, `sku`, `brand`,
  `short_description`, `full_description`, `price`, `sale_price`,
  `stock_quantity`, `status`, `is_featured`, `created_at`
)
SELECT
  c.`id`, NULL,
  'CoQ10 Capsules', 'coq10-capsules', 'LIFE-COQ-001', 'Medral Health',
  'Coenzyme Q10 capsules for cellular energy.',
  'Placeholder product for go-live. Replace description and imagery in Admin.',
  999.00, NULL, 100, 'published', 0, '2026-01-01 12:00:00'
FROM `categories` c
WHERE c.`slug` = 'lifestyle'
  AND NOT EXISTS (SELECT 1 FROM `products` WHERE `slug` = 'coq10-capsules')
  AND NOT EXISTS (SELECT 1 FROM `products` WHERE `sku` = 'LIFE-COQ-001');

-- By Product tab placeholders
INSERT INTO `products` (
  `category_id`, `subcategory_id`, `title`, `slug`, `sku`, `brand`,
  `short_description`, `full_description`, `price`, `sale_price`,
  `stock_quantity`, `status`, `is_featured`, `created_at`
)
SELECT
  c.`id`, NULL,
  'Collagen Reglow', 'collagen-reglow', 'COL-REGLOW-001', 'Medral Health',
  'Collagen formula for skin glow.',
  'Placeholder product for go-live. Replace description and imagery in Admin.',
  999.00, NULL, 100, 'published', 1, '2026-01-04 12:00:00'
FROM `categories` c
WHERE c.`slug` = 'collagen'
  AND NOT EXISTS (SELECT 1 FROM `products` WHERE `slug` = 'collagen-reglow')
  AND NOT EXISTS (SELECT 1 FROM `products` WHERE `sku` = 'COL-REGLOW-001');

INSERT INTO `products` (
  `category_id`, `subcategory_id`, `title`, `slug`, `sku`, `brand`,
  `short_description`, `full_description`, `price`, `sale_price`,
  `stock_quantity`, `status`, `is_featured`, `created_at`
)
SELECT
  c.`id`, NULL,
  'Mag 5X Pro', 'mag-5x-pro', 'CAP-MAG5X-001', 'Medral Health',
  'Advanced magnesium capsule formula.',
  'Placeholder product for go-live. Replace description and imagery in Admin.',
  999.00, NULL, 100, 'published', 1, '2026-01-04 12:00:00'
FROM `categories` c
WHERE c.`slug` = 'capsules'
  AND NOT EXISTS (SELECT 1 FROM `products` WHERE `slug` = 'mag-5x-pro')
  AND NOT EXISTS (SELECT 1 FROM `products` WHERE `sku` = 'CAP-MAG5X-001');

-- -----------------------------------------------------------------------------
-- Primary images (mega-menu placeholders until real photos are uploaded)
-- -----------------------------------------------------------------------------
INSERT INTO `product_images` (`product_id`, `image_url`, `alt_text`, `display_order`, `is_primary`)
SELECT p.`id`, '/assets/images/megamenu/placeholder-1.svg', p.`title`, 0, 1
FROM `products` p
WHERE p.`slug` = 'l-glutathione-capsules'
  AND NOT EXISTS (SELECT 1 FROM `product_images` pi WHERE pi.`product_id` = p.`id` AND pi.`is_primary` = 1);

INSERT INTO `product_images` (`product_id`, `image_url`, `alt_text`, `display_order`, `is_primary`)
SELECT p.`id`, '/assets/images/megamenu/placeholder-2.svg', p.`title`, 0, 1
FROM `products` p
WHERE p.`slug` = 'marine-collagen-powder'
  AND NOT EXISTS (SELECT 1 FROM `product_images` pi WHERE pi.`product_id` = p.`id` AND pi.`is_primary` = 1);

INSERT INTO `product_images` (`product_id`, `image_url`, `alt_text`, `display_order`, `is_primary`)
SELECT p.`id`, '/assets/images/megamenu/placeholder-3.svg', p.`title`, 0, 1
FROM `products` p
WHERE p.`slug` = 'hydrogel-eye-patches'
  AND NOT EXISTS (SELECT 1 FROM `product_images` pi WHERE pi.`product_id` = p.`id` AND pi.`is_primary` = 1);

INSERT INTO `product_images` (`product_id`, `image_url`, `alt_text`, `display_order`, `is_primary`)
SELECT p.`id`, '/assets/images/megamenu/placeholder-4.svg', p.`title`, 0, 1
FROM `products` p
WHERE p.`slug` = 'marine-collagen-unflavoured-powder'
  AND NOT EXISTS (SELECT 1 FROM `product_images` pi WHERE pi.`product_id` = p.`id` AND pi.`is_primary` = 1);

INSERT INTO `product_images` (`product_id`, `image_url`, `alt_text`, `display_order`, `is_primary`)
SELECT p.`id`, '/assets/images/megamenu/placeholder-1.svg', p.`title`, 0, 1
FROM `products` p
WHERE p.`slug` = 'hair-growth-with-biotin-capsules'
  AND NOT EXISTS (SELECT 1 FROM `product_images` pi WHERE pi.`product_id` = p.`id` AND pi.`is_primary` = 1);

INSERT INTO `product_images` (`product_id`, `image_url`, `alt_text`, `display_order`, `is_primary`)
SELECT p.`id`, '/assets/images/megamenu/placeholder-3.svg', p.`title`, 0, 1
FROM `products` p
WHERE p.`slug` = 'omega-3-with-astaxanthin'
  AND NOT EXISTS (SELECT 1 FROM `product_images` pi WHERE pi.`product_id` = p.`id` AND pi.`is_primary` = 1);

INSERT INTO `product_images` (`product_id`, `image_url`, `alt_text`, `display_order`, `is_primary`)
SELECT p.`id`, '/assets/images/megamenu/placeholder-2.svg', p.`title`, 0, 1
FROM `products` p
WHERE p.`slug` = 'magnesium-with-d3-k2-zinc'
  AND NOT EXISTS (SELECT 1 FROM `product_images` pi WHERE pi.`product_id` = p.`id` AND pi.`is_primary` = 1);

INSERT INTO `product_images` (`product_id`, `image_url`, `alt_text`, `display_order`, `is_primary`)
SELECT p.`id`, '/assets/images/megamenu/placeholder-1.svg', p.`title`, 0, 1
FROM `products` p
WHERE p.`slug` = 'lung-liver-detox-capsules'
  AND NOT EXISTS (SELECT 1 FROM `product_images` pi WHERE pi.`product_id` = p.`id` AND pi.`is_primary` = 1);

INSERT INTO `product_images` (`product_id`, `image_url`, `alt_text`, `display_order`, `is_primary`)
SELECT p.`id`, '/assets/images/megamenu/placeholder-4.svg', p.`title`, 0, 1
FROM `products` p
WHERE p.`slug` = 'testosterone-booster-capsules-for-men'
  AND NOT EXISTS (SELECT 1 FROM `product_images` pi WHERE pi.`product_id` = p.`id` AND pi.`is_primary` = 1);

INSERT INTO `product_images` (`product_id`, `image_url`, `alt_text`, `display_order`, `is_primary`)
SELECT p.`id`, '/assets/images/megamenu/placeholder-1.svg', p.`title`, 0, 1
FROM `products` p
WHERE p.`slug` = 'coq10-capsules'
  AND NOT EXISTS (SELECT 1 FROM `product_images` pi WHERE pi.`product_id` = p.`id` AND pi.`is_primary` = 1);

INSERT INTO `product_images` (`product_id`, `image_url`, `alt_text`, `display_order`, `is_primary`)
SELECT p.`id`, '/assets/images/megamenu/placeholder-4.svg', p.`title`, 0, 1
FROM `products` p
WHERE p.`slug` = 'collagen-reglow'
  AND NOT EXISTS (SELECT 1 FROM `product_images` pi WHERE pi.`product_id` = p.`id` AND pi.`is_primary` = 1);

INSERT INTO `product_images` (`product_id`, `image_url`, `alt_text`, `display_order`, `is_primary`)
SELECT p.`id`, '/assets/images/megamenu/placeholder-2.svg', p.`title`, 0, 1
FROM `products` p
WHERE p.`slug` = 'mag-5x-pro'
  AND NOT EXISTS (SELECT 1 FROM `product_images` pi WHERE pi.`product_id` = p.`id` AND pi.`is_primary` = 1);

-- Align existing rows (re-seed after earlier minimal catalog) to header order
UPDATE `products` SET `created_at` = '2026-01-04 12:00:00', `is_featured` = 1, `title` = 'L-Glutathione Capsules'
WHERE `slug` = 'l-glutathione-capsules';
UPDATE `products` SET `created_at` = '2026-01-03 12:00:00', `is_featured` = 0 WHERE `slug` = 'marine-collagen-powder';
UPDATE `products` SET `created_at` = '2026-01-02 12:00:00', `is_featured` = 0 WHERE `slug` = 'hydrogel-eye-patches';
UPDATE `products` SET `created_at` = '2026-01-01 12:00:00', `is_featured` = 0 WHERE `slug` = 'marine-collagen-unflavoured-powder';
UPDATE `products` SET `created_at` = '2026-01-04 12:00:00', `is_featured` = 1 WHERE `slug` = 'hair-growth-with-biotin-capsules';
UPDATE `products` SET `created_at` = '2026-01-05 12:00:00', `is_featured` = 1 WHERE `slug` = 'omega-3-with-astaxanthin';
UPDATE `products` SET `created_at` = '2026-01-04 12:00:00', `is_featured` = 0 WHERE `slug` = 'magnesium-with-d3-k2-zinc';
UPDATE `products` SET `created_at` = '2026-01-03 12:00:00', `is_featured` = 0 WHERE `slug` = 'lung-liver-detox-capsules';
UPDATE `products` SET `created_at` = '2026-01-02 12:00:00', `is_featured` = 0 WHERE `slug` = 'testosterone-booster-capsules-for-men';
UPDATE `products` SET `created_at` = '2026-01-01 12:00:00', `is_featured` = 0 WHERE `slug` = 'coq10-capsules';
