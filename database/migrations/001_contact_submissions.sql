-- Migration: contact_submissions lead-capture table
-- Safe to run on existing Medral Health databases.

CREATE TABLE IF NOT EXISTS `contact_submissions` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(150) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `phone` VARCHAR(40) DEFAULT NULL,
  `company` VARCHAR(200) DEFAULT NULL,
  `service` VARCHAR(150) DEFAULT NULL,
  `product_category` VARCHAR(150) DEFAULT NULL,
  `quantity` VARCHAR(100) DEFAULT NULL,
  `message` TEXT DEFAULT NULL,
  `newsletter` TINYINT(1) NOT NULL DEFAULT 0,
  `source` VARCHAR(50) NOT NULL DEFAULT 'contact_page',
  `ip_address` VARCHAR(45) DEFAULT NULL,
  `user_agent` VARCHAR(500) DEFAULT NULL,
  `email_sent` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_contact_submissions_created_at` (`created_at`),
  KEY `idx_contact_submissions_email` (`email`),
  KEY `idx_contact_submissions_source` (`source`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
