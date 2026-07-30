-- =============================================================================
-- Medral Health Co — Seed / Bootstrap Notes
-- =============================================================================
-- Admin accounts are NOT seeded with a published password.
-- Create the first administrator securely:
--
--   npm run create-admin -- --email you@example.com --name "Admin Name" --password "<strong-secret>"
--
-- If a previous install used a known published default credential hash, the
-- statement below deactivates that account so it cannot be reused.
-- =============================================================================

UPDATE `admin_users`
SET
  `is_active` = 0,
  `password_hash` = CONCAT('$2b$12$ROTATED_INVALID_', REPLACE(UUID(), '-', ''))
WHERE `email` = 'admin@medralhealth.com'
  AND `password_hash` = '$2b$10$jv5F3OenAXncUPKM7/2.xuwEdCWgvUHeBpgO8NyGMDqx0h0srhgX2';
