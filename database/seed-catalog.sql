-- =============================================================================
-- Medral Health Co — Catalog Seed (15 SKUs)
-- Beauty / Lifestyle / Recovery
-- =============================================================================
-- Prerequisites: import database/schema.sql first.
-- Safe to re-run: skips rows whose slug/sku already exists.
--
-- Import order (empty DB):
--   1. schema.sql
--   2. seed.sql          (optional)
--   3. seed-catalog.sql  (this file)
--
-- Existing DBs that already seeded skin/hair/collagen: run
--   migrations/004_beauty_recovery_catalog.sql
-- instead of (or before) relying on this file alone.
--
-- Prices: Beauty/Lifestyle ₹999; Recovery ₹1500. Images = megamenu placeholders.
-- =============================================================================

SET NAMES utf8mb4;

-- -----------------------------------------------------------------------------
-- Categories
-- -----------------------------------------------------------------------------
INSERT INTO `categories` (`name`, `slug`, `description`, `image_url`, `is_active`, `display_order`)
SELECT 'Beauty', 'beauty', 'Beauty, skin, and hair care products.', NULL, 1, 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `categories` WHERE `slug` = 'beauty');

INSERT INTO `categories` (`name`, `slug`, `description`, `image_url`, `is_active`, `display_order`)
SELECT 'Lifestyle', 'lifestyle', 'Everyday wellness and lifestyle supplements.', NULL, 1, 2
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `categories` WHERE `slug` = 'lifestyle');

INSERT INTO `categories` (`name`, `slug`, `description`, `image_url`, `is_active`, `display_order`)
SELECT 'Recovery', 'recovery', 'Supports, belts, and recovery essentials.', NULL, 1, 3
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `categories` WHERE `slug` = 'recovery');

-- -----------------------------------------------------------------------------
-- Beauty (5) — price 999.00 — display order via created_at DESC
-- -----------------------------------------------------------------------------
INSERT INTO `products` (
  `category_id`, `subcategory_id`, `title`, `slug`, `sku`, `brand`,
  `short_description`, `full_description`, `price`, `sale_price`,
  `stock_quantity`, `status`, `is_featured`, `created_at`
)
SELECT
  c.`id`, NULL,
  'M&H Skin Renewal Capsules', 'mh-skin-renewal-capsules', 'BEA-SRC-001', 'M&H',
  'Skin renewal support capsules.',
  'Placeholder product. Replace description and imagery in Admin.',
  999.00, NULL, 100, 'published', 1, '2026-02-05 12:00:00'
FROM `categories` c
WHERE c.`slug` = 'beauty'
  AND NOT EXISTS (SELECT 1 FROM `products` WHERE `slug` = 'mh-skin-renewal-capsules')
  AND NOT EXISTS (SELECT 1 FROM `products` WHERE `sku` = 'BEA-SRC-001');

INSERT INTO `products` (
  `category_id`, `subcategory_id`, `title`, `slug`, `sku`, `brand`,
  `short_description`, `full_description`, `price`, `sale_price`,
  `stock_quantity`, `status`, `is_featured`, `created_at`
)
SELECT
  c.`id`, NULL,
  'M&H Marine Collagen (powder)', 'mh-marine-collagen-powder', 'BEA-MCP-001', 'M&H',
  'Marine collagen powder for skin support.',
  'Placeholder product. Replace description and imagery in Admin.',
  999.00, NULL, 100, 'published', 0, '2026-02-04 12:00:00'
FROM `categories` c
WHERE c.`slug` = 'beauty'
  AND NOT EXISTS (SELECT 1 FROM `products` WHERE `slug` = 'mh-marine-collagen-powder')
  AND NOT EXISTS (SELECT 1 FROM `products` WHERE `sku` = 'BEA-MCP-001');

INSERT INTO `products` (
  `category_id`, `subcategory_id`, `title`, `slug`, `sku`, `brand`,
  `short_description`, `full_description`, `price`, `sale_price`,
  `stock_quantity`, `status`, `is_featured`, `created_at`
)
SELECT
  c.`id`, NULL,
  'M&H Hydrogel Eye Patches', 'mh-hydrogel-eye-patches', 'BEA-EYE-001', 'M&H',
  'Hydrogel eye patches for under-eye care.',
  'Placeholder product. Replace description and imagery in Admin.',
  999.00, NULL, 100, 'published', 0, '2026-02-03 12:00:00'
FROM `categories` c
WHERE c.`slug` = 'beauty'
  AND NOT EXISTS (SELECT 1 FROM `products` WHERE `slug` = 'mh-hydrogel-eye-patches')
  AND NOT EXISTS (SELECT 1 FROM `products` WHERE `sku` = 'BEA-EYE-001');

INSERT INTO `products` (
  `category_id`, `subcategory_id`, `title`, `slug`, `sku`, `brand`,
  `short_description`, `full_description`, `price`, `sale_price`,
  `stock_quantity`, `status`, `is_featured`, `created_at`
)
SELECT
  c.`id`, NULL,
  'M&H Naked Marine Collagen (Unflavoured) powder', 'mh-naked-marine-collagen-unflavoured-powder', 'BEA-MCU-001', 'M&H',
  'Unflavoured marine collagen powder.',
  'Placeholder product. Replace description and imagery in Admin.',
  999.00, NULL, 100, 'published', 0, '2026-02-02 12:00:00'
FROM `categories` c
WHERE c.`slug` = 'beauty'
  AND NOT EXISTS (SELECT 1 FROM `products` WHERE `slug` = 'mh-naked-marine-collagen-unflavoured-powder')
  AND NOT EXISTS (SELECT 1 FROM `products` WHERE `sku` = 'BEA-MCU-001');

INSERT INTO `products` (
  `category_id`, `subcategory_id`, `title`, `slug`, `sku`, `brand`,
  `short_description`, `full_description`, `price`, `sale_price`,
  `stock_quantity`, `status`, `is_featured`, `created_at`
)
SELECT
  c.`id`, NULL,
  'M&H Hair Growth Capsules', 'mh-hair-growth-capsules', 'BEA-HAIR-001', 'M&H',
  'Hair growth support capsules.',
  'Placeholder product. Replace description and imagery in Admin.',
  999.00, NULL, 100, 'published', 0, '2026-02-01 12:00:00'
FROM `categories` c
WHERE c.`slug` = 'beauty'
  AND NOT EXISTS (SELECT 1 FROM `products` WHERE `slug` = 'mh-hair-growth-capsules')
  AND NOT EXISTS (SELECT 1 FROM `products` WHERE `sku` = 'BEA-HAIR-001');

-- -----------------------------------------------------------------------------
-- Lifestyle (5) — price 999.00
-- -----------------------------------------------------------------------------
INSERT INTO `products` (
  `category_id`, `subcategory_id`, `title`, `slug`, `sku`, `brand`,
  `short_description`, `full_description`, `price`, `sale_price`,
  `stock_quantity`, `status`, `is_featured`, `created_at`
)
SELECT
  c.`id`, NULL,
  'M&H Omega-3 with Astaxanthin', 'mh-omega-3-with-astaxanthin', 'LIF-OM3-001', 'M&H',
  'Omega-3 with Astaxanthin softgels.',
  'Placeholder product. Replace description and imagery in Admin.',
  999.00, NULL, 100, 'published', 1, '2026-02-05 12:00:00'
FROM `categories` c
WHERE c.`slug` = 'lifestyle'
  AND NOT EXISTS (SELECT 1 FROM `products` WHERE `slug` = 'mh-omega-3-with-astaxanthin')
  AND NOT EXISTS (SELECT 1 FROM `products` WHERE `sku` = 'LIF-OM3-001');

INSERT INTO `products` (
  `category_id`, `subcategory_id`, `title`, `slug`, `sku`, `brand`,
  `short_description`, `full_description`, `price`, `sale_price`,
  `stock_quantity`, `status`, `is_featured`, `created_at`
)
SELECT
  c.`id`, NULL,
  'M&H Mag5X Pro with Vitamin D3, K2 & Zinc', 'mh-mag5x-pro-with-vitamin-d3-k2-zinc', 'LIF-MAG5X-001', 'M&H',
  'Advanced magnesium with D3, K2, and zinc.',
  'Placeholder product. Replace description and imagery in Admin.',
  999.00, NULL, 100, 'published', 0, '2026-02-04 12:00:00'
FROM `categories` c
WHERE c.`slug` = 'lifestyle'
  AND NOT EXISTS (SELECT 1 FROM `products` WHERE `slug` = 'mh-mag5x-pro-with-vitamin-d3-k2-zinc')
  AND NOT EXISTS (SELECT 1 FROM `products` WHERE `sku` = 'LIF-MAG5X-001');

INSERT INTO `products` (
  `category_id`, `subcategory_id`, `title`, `slug`, `sku`, `brand`,
  `short_description`, `full_description`, `price`, `sale_price`,
  `stock_quantity`, `status`, `is_featured`, `created_at`
)
SELECT
  c.`id`, NULL,
  'M&H Lung & Liver Core Detox', 'mh-lung-liver-core-detox', 'LIF-DET-001', 'M&H',
  'Lung and liver core detox support.',
  'Placeholder product. Replace description and imagery in Admin.',
  999.00, NULL, 100, 'published', 0, '2026-02-03 12:00:00'
FROM `categories` c
WHERE c.`slug` = 'lifestyle'
  AND NOT EXISTS (SELECT 1 FROM `products` WHERE `slug` = 'mh-lung-liver-core-detox')
  AND NOT EXISTS (SELECT 1 FROM `products` WHERE `sku` = 'LIF-DET-001');

INSERT INTO `products` (
  `category_id`, `subcategory_id`, `title`, `slug`, `sku`, `brand`,
  `short_description`, `full_description`, `price`, `sale_price`,
  `stock_quantity`, `status`, `is_featured`, `created_at`
)
SELECT
  c.`id`, NULL,
  'M&H Testosterone Booster Capsules for Men', 'mh-testosterone-booster-capsules-for-men', 'LIF-TEST-001', 'M&H',
  'Testosterone support capsules for men.',
  'Placeholder product. Replace description and imagery in Admin.',
  999.00, NULL, 100, 'published', 0, '2026-02-02 12:00:00'
FROM `categories` c
WHERE c.`slug` = 'lifestyle'
  AND NOT EXISTS (SELECT 1 FROM `products` WHERE `slug` = 'mh-testosterone-booster-capsules-for-men')
  AND NOT EXISTS (SELECT 1 FROM `products` WHERE `sku` = 'LIF-TEST-001');

INSERT INTO `products` (
  `category_id`, `subcategory_id`, `title`, `slug`, `sku`, `brand`,
  `short_description`, `full_description`, `price`, `sale_price`,
  `stock_quantity`, `status`, `is_featured`, `created_at`
)
SELECT
  c.`id`, NULL,
  'M&H CoQ10 with BioPerine®', 'mh-coq10-with-bioperine', 'LIF-COQ-001', 'M&H',
  'CoQ10 with BioPerine for absorption support.',
  'Placeholder product. Replace description and imagery in Admin.',
  999.00, NULL, 100, 'published', 0, '2026-02-01 12:00:00'
FROM `categories` c
WHERE c.`slug` = 'lifestyle'
  AND NOT EXISTS (SELECT 1 FROM `products` WHERE `slug` = 'mh-coq10-with-bioperine')
  AND NOT EXISTS (SELECT 1 FROM `products` WHERE `sku` = 'LIF-COQ-001');

-- -----------------------------------------------------------------------------
-- Recovery (5) — price 1500.00
-- -----------------------------------------------------------------------------
INSERT INTO `products` (
  `category_id`, `subcategory_id`, `title`, `slug`, `sku`, `brand`,
  `short_description`, `full_description`, `price`, `sale_price`,
  `stock_quantity`, `status`, `is_featured`, `created_at`
)
SELECT
  c.`id`, NULL,
  'Knee Support', 'knee-support', 'REC-KNEE-001', 'M&H',
  'Knee support for recovery and stability.',
  'Placeholder product. Replace description and imagery in Admin.',
  1500.00, NULL, 100, 'published', 1, '2026-02-05 12:00:00'
FROM `categories` c
WHERE c.`slug` = 'recovery'
  AND NOT EXISTS (SELECT 1 FROM `products` WHERE `slug` = 'knee-support')
  AND NOT EXISTS (SELECT 1 FROM `products` WHERE `sku` = 'REC-KNEE-001');

INSERT INTO `products` (
  `category_id`, `subcategory_id`, `title`, `slug`, `sku`, `brand`,
  `short_description`, `full_description`, `price`, `sale_price`,
  `stock_quantity`, `status`, `is_featured`, `created_at`
)
SELECT
  c.`id`, NULL,
  'Ankle Support', 'ankle-support', 'REC-ANK-001', 'M&H',
  'Ankle support for recovery and stability.',
  'Placeholder product. Replace description and imagery in Admin.',
  1500.00, NULL, 100, 'published', 0, '2026-02-04 12:00:00'
FROM `categories` c
WHERE c.`slug` = 'recovery'
  AND NOT EXISTS (SELECT 1 FROM `products` WHERE `slug` = 'ankle-support')
  AND NOT EXISTS (SELECT 1 FROM `products` WHERE `sku` = 'REC-ANK-001');

INSERT INTO `products` (
  `category_id`, `subcategory_id`, `title`, `slug`, `sku`, `brand`,
  `short_description`, `full_description`, `price`, `sale_price`,
  `stock_quantity`, `status`, `is_featured`, `created_at`
)
SELECT
  c.`id`, NULL,
  'Elbow Support', 'elbow-support', 'REC-ELB-001', 'M&H',
  'Elbow support for recovery and stability.',
  'Placeholder product. Replace description and imagery in Admin.',
  1500.00, NULL, 100, 'published', 0, '2026-02-03 12:00:00'
FROM `categories` c
WHERE c.`slug` = 'recovery'
  AND NOT EXISTS (SELECT 1 FROM `products` WHERE `slug` = 'elbow-support')
  AND NOT EXISTS (SELECT 1 FROM `products` WHERE `sku` = 'REC-ELB-001');

INSERT INTO `products` (
  `category_id`, `subcategory_id`, `title`, `slug`, `sku`, `brand`,
  `short_description`, `full_description`, `price`, `sale_price`,
  `stock_quantity`, `status`, `is_featured`, `created_at`
)
SELECT
  c.`id`, NULL,
  'LS Belt', 'ls-belt', 'REC-LSB-001', 'M&H',
  'Lumbar support belt.',
  'Placeholder product. Replace description and imagery in Admin.',
  1500.00, NULL, 100, 'published', 0, '2026-02-02 12:00:00'
FROM `categories` c
WHERE c.`slug` = 'recovery'
  AND NOT EXISTS (SELECT 1 FROM `products` WHERE `slug` = 'ls-belt')
  AND NOT EXISTS (SELECT 1 FROM `products` WHERE `sku` = 'REC-LSB-001');

INSERT INTO `products` (
  `category_id`, `subcategory_id`, `title`, `slug`, `sku`, `brand`,
  `short_description`, `full_description`, `price`, `sale_price`,
  `stock_quantity`, `status`, `is_featured`, `created_at`
)
SELECT
  c.`id`, NULL,
  'Digital Scale', 'digital-scale', 'REC-SCALE-001', 'M&H',
  'Digital scale for tracking.',
  'Placeholder product. Replace description and imagery in Admin.',
  1500.00, NULL, 100, 'published', 0, '2026-02-01 12:00:00'
FROM `categories` c
WHERE c.`slug` = 'recovery'
  AND NOT EXISTS (SELECT 1 FROM `products` WHERE `slug` = 'digital-scale')
  AND NOT EXISTS (SELECT 1 FROM `products` WHERE `sku` = 'REC-SCALE-001');

-- -----------------------------------------------------------------------------
-- Primary images (megamenu placeholders)
-- -----------------------------------------------------------------------------
INSERT INTO `product_images` (`product_id`, `image_url`, `alt_text`, `display_order`, `is_primary`)
SELECT p.`id`, '/assets/images/megamenu/placeholder-1.svg', p.`title`, 0, 1
FROM `products` p
WHERE p.`slug` = 'mh-skin-renewal-capsules'
  AND NOT EXISTS (SELECT 1 FROM `product_images` pi WHERE pi.`product_id` = p.`id` AND pi.`is_primary` = 1);

INSERT INTO `product_images` (`product_id`, `image_url`, `alt_text`, `display_order`, `is_primary`)
SELECT p.`id`, '/assets/images/megamenu/placeholder-2.svg', p.`title`, 0, 1
FROM `products` p
WHERE p.`slug` = 'mh-marine-collagen-powder'
  AND NOT EXISTS (SELECT 1 FROM `product_images` pi WHERE pi.`product_id` = p.`id` AND pi.`is_primary` = 1);

INSERT INTO `product_images` (`product_id`, `image_url`, `alt_text`, `display_order`, `is_primary`)
SELECT p.`id`, '/assets/images/megamenu/placeholder-3.svg', p.`title`, 0, 1
FROM `products` p
WHERE p.`slug` = 'mh-hydrogel-eye-patches'
  AND NOT EXISTS (SELECT 1 FROM `product_images` pi WHERE pi.`product_id` = p.`id` AND pi.`is_primary` = 1);

INSERT INTO `product_images` (`product_id`, `image_url`, `alt_text`, `display_order`, `is_primary`)
SELECT p.`id`, '/assets/images/megamenu/placeholder-4.svg', p.`title`, 0, 1
FROM `products` p
WHERE p.`slug` = 'mh-naked-marine-collagen-unflavoured-powder'
  AND NOT EXISTS (SELECT 1 FROM `product_images` pi WHERE pi.`product_id` = p.`id` AND pi.`is_primary` = 1);

INSERT INTO `product_images` (`product_id`, `image_url`, `alt_text`, `display_order`, `is_primary`)
SELECT p.`id`, '/assets/images/megamenu/placeholder-1.svg', p.`title`, 0, 1
FROM `products` p
WHERE p.`slug` = 'mh-hair-growth-capsules'
  AND NOT EXISTS (SELECT 1 FROM `product_images` pi WHERE pi.`product_id` = p.`id` AND pi.`is_primary` = 1);

INSERT INTO `product_images` (`product_id`, `image_url`, `alt_text`, `display_order`, `is_primary`)
SELECT p.`id`, '/assets/images/megamenu/placeholder-3.svg', p.`title`, 0, 1
FROM `products` p
WHERE p.`slug` = 'mh-omega-3-with-astaxanthin'
  AND NOT EXISTS (SELECT 1 FROM `product_images` pi WHERE pi.`product_id` = p.`id` AND pi.`is_primary` = 1);

INSERT INTO `product_images` (`product_id`, `image_url`, `alt_text`, `display_order`, `is_primary`)
SELECT p.`id`, '/assets/images/megamenu/placeholder-2.svg', p.`title`, 0, 1
FROM `products` p
WHERE p.`slug` = 'mh-mag5x-pro-with-vitamin-d3-k2-zinc'
  AND NOT EXISTS (SELECT 1 FROM `product_images` pi WHERE pi.`product_id` = p.`id` AND pi.`is_primary` = 1);

INSERT INTO `product_images` (`product_id`, `image_url`, `alt_text`, `display_order`, `is_primary`)
SELECT p.`id`, '/assets/images/megamenu/placeholder-1.svg', p.`title`, 0, 1
FROM `products` p
WHERE p.`slug` = 'mh-lung-liver-core-detox'
  AND NOT EXISTS (SELECT 1 FROM `product_images` pi WHERE pi.`product_id` = p.`id` AND pi.`is_primary` = 1);

INSERT INTO `product_images` (`product_id`, `image_url`, `alt_text`, `display_order`, `is_primary`)
SELECT p.`id`, '/assets/images/megamenu/placeholder-4.svg', p.`title`, 0, 1
FROM `products` p
WHERE p.`slug` = 'mh-testosterone-booster-capsules-for-men'
  AND NOT EXISTS (SELECT 1 FROM `product_images` pi WHERE pi.`product_id` = p.`id` AND pi.`is_primary` = 1);

INSERT INTO `product_images` (`product_id`, `image_url`, `alt_text`, `display_order`, `is_primary`)
SELECT p.`id`, '/assets/images/megamenu/placeholder-1.svg', p.`title`, 0, 1
FROM `products` p
WHERE p.`slug` = 'mh-coq10-with-bioperine'
  AND NOT EXISTS (SELECT 1 FROM `product_images` pi WHERE pi.`product_id` = p.`id` AND pi.`is_primary` = 1);

INSERT INTO `product_images` (`product_id`, `image_url`, `alt_text`, `display_order`, `is_primary`)
SELECT p.`id`, '/assets/images/megamenu/placeholder-2.svg', p.`title`, 0, 1
FROM `products` p
WHERE p.`slug` = 'knee-support'
  AND NOT EXISTS (SELECT 1 FROM `product_images` pi WHERE pi.`product_id` = p.`id` AND pi.`is_primary` = 1);

INSERT INTO `product_images` (`product_id`, `image_url`, `alt_text`, `display_order`, `is_primary`)
SELECT p.`id`, '/assets/images/megamenu/placeholder-3.svg', p.`title`, 0, 1
FROM `products` p
WHERE p.`slug` = 'ankle-support'
  AND NOT EXISTS (SELECT 1 FROM `product_images` pi WHERE pi.`product_id` = p.`id` AND pi.`is_primary` = 1);

INSERT INTO `product_images` (`product_id`, `image_url`, `alt_text`, `display_order`, `is_primary`)
SELECT p.`id`, '/assets/images/megamenu/placeholder-4.svg', p.`title`, 0, 1
FROM `products` p
WHERE p.`slug` = 'elbow-support'
  AND NOT EXISTS (SELECT 1 FROM `product_images` pi WHERE pi.`product_id` = p.`id` AND pi.`is_primary` = 1);

INSERT INTO `product_images` (`product_id`, `image_url`, `alt_text`, `display_order`, `is_primary`)
SELECT p.`id`, '/assets/images/megamenu/placeholder-1.svg', p.`title`, 0, 1
FROM `products` p
WHERE p.`slug` = 'ls-belt'
  AND NOT EXISTS (SELECT 1 FROM `product_images` pi WHERE pi.`product_id` = p.`id` AND pi.`is_primary` = 1);

INSERT INTO `product_images` (`product_id`, `image_url`, `alt_text`, `display_order`, `is_primary`)
SELECT p.`id`, '/assets/images/megamenu/placeholder-2.svg', p.`title`, 0, 1
FROM `products` p
WHERE p.`slug` = 'digital-scale'
  AND NOT EXISTS (SELECT 1 FROM `product_images` pi WHERE pi.`product_id` = p.`id` AND pi.`is_primary` = 1);
