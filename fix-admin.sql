-- NPS ERP - Fix Admin User
-- Run this to create/fix the admin user

-- First, check what users exist
SELECT email, role, "isActive" FROM "User";

-- Delete existing admin if any (to start fresh)
DELETE FROM "User" WHERE email = 'admin@erp.com';

-- Create admin user with correct password hash
-- Password: Admin@123
INSERT INTO "User" (
  id,
  name,
  email,
  "passwordHash",
  role,
  "isActive",
  "createdAt",
  "updatedAt"
) VALUES (
  gen_random_uuid(),
  'System Administrator',
  'admin@erp.com',
  '$2a$10$YQs7HF5YVKGNqKvC1TZ9/.YqF5xVJxLHqL6iKQBqJ9JuQKX6nKEYK',
  'ADMIN',
  true,
  NOW(),
  NOW()
);

-- Verify admin was created
SELECT
  id,
  name,
  email,
  role,
  "isActive",
  "createdAt"
FROM "User"
WHERE email = 'admin@erp.com';

-- Show all users
SELECT email, role, "isActive" FROM "User" ORDER BY "createdAt";
