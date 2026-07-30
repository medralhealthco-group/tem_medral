-- Align cart_items unit-price column with application code.
-- Safe on DBs that already use price_at_addition (no-op path via procedure-less checks).

-- If legacy column `price` exists, rename it.
-- Run manually on Hostinger if needed:
--   ALTER TABLE `cart_items` CHANGE COLUMN `price` `price_at_addition` DECIMAL(10,2) NOT NULL DEFAULT '0.00';

SELECT COLUMN_NAME
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'cart_items'
  AND COLUMN_NAME IN ('price', 'price_at_addition');
