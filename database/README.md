# Medral Health Co — Database Migration & Setup Guide

This directory contains the single source of truth database SQL scripts for the Medral Health Co E-Commerce Module.

---

## SQL File Manifest

1. **`schema.sql`**: Complete DDL file defining all normalized MySQL database tables, primary keys, foreign keys, unique constraints, and performance indexes.
2. **`seed.sql`**: Optional hardening script that invalidates a previously published default admin credential hash. It does **not** create an admin with a known password.
3. **`seed-catalog.sql`**: Hybrid go-live catalog seed — categories (`skin`, `hair`, `lifestyle`, `collagen`, `capsules`) plus the full Skin/Hair/Lifestyle header products (and By Product placeholders) with primary images. Safe to re-run (skips existing slugs/SKUs).
4. **`migrations/001_contact_submissions.sql`**: Adds the `contact_submissions` table for lead capture (also included in `schema.sql` for new installs).

**Import order (empty Hostinger DB):**

1. `schema.sql`
2. `seed.sql` (optional)
3. `seed-catalog.sql`

After schema import on an existing database that already has tables but is missing contact submissions, run:

```bash
mysql -h <HOST> -u <DB_USER> -p <DB_NAME> < database/migrations/001_contact_submissions.sql
```

---

## Instructions for Hostinger phpMyAdmin / MySQL Setup

### Option 1: Using phpMyAdmin (Hostinger Dashboard)
1. Log in to your **Hostinger Control Panel (hPanel)**.
2. Open **Databases -> phpMyAdmin**.
3. Select your application database from the left sidebar.
4. Click on the **Import** tab in the top navigation bar.
5. Import in order: `database/schema.sql` → optionally `database/seed.sql` → `database/seed-catalog.sql`.
6. Confirm categories plus Skin (4) / Hair (1) / Lifestyle (5) published products (and By Product placeholders), each with a primary image.
7. Create an administrator with a strong secret (see below).

### Option 2: Using MySQL Command Line Interface (CLI)
```bash
# 1. Import Schema
mysql -h <HOSTINGER_DB_HOST> -u <DB_USER> -p <DB_NAME> < database/schema.sql

# 2. Optional: invalidate legacy published default admin hash
mysql -h <HOSTINGER_DB_HOST> -u <DB_USER> -p <DB_NAME> < database/seed.sql

# 3. Hybrid catalog seed (mega menu categories + placeholder products)
mysql -h <HOSTINGER_DB_HOST> -u <DB_USER> -p <DB_NAME> < database/seed-catalog.sql
```

---

## Create Administrator (required)

Never commit plaintext admin passwords. Create (or reset) an admin locally:

```bash
npm run create-admin -- --email you@example.com --name "System Administrator" --password "<strong-secret>"
```

Password requirements match the application: at least 8 characters, including a letter and a number or symbol.

> Store the password in your password manager. Change it after first login via `/admin/change-password` if the account was shared during setup.
