-- =============================================================================
-- Migration 004: Beauty / Lifestyle / Recovery catalog reset
-- =============================================================================
-- For databases that already seeded skin/hair/collagen/capsules (or mixed catalogs).
-- Clears existing catalog products/categories, then you must import
-- database/seed-catalog.sql to insert the 15 M&H + Recovery SKUs.
--
-- WARNING: Deletes all products (and related cart line items / images).
-- Order line items keep rows with product_id set NULL. Backup before production.
--
-- Usage:
--   1. mysql ... < database/migrations/004_beauty_recovery_catalog.sql
--   2. mysql ... < database/seed-catalog.sql
--   Or: node scripts/seed-local.js --beauty-recovery
-- =============================================================================

SET NAMES utf8mb4;

-- Explicit deletes (do not rely on CASCADE while FK checks may be toggled)
DELETE FROM `product_images`;
DELETE FROM `cart_items`;
DELETE FROM `products`;
DELETE FROM `subcategories`;
DELETE FROM `categories`;
