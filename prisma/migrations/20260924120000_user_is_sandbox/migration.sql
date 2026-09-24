-- Sandbox login flag (Akash). Default false: every existing user is unaffected.
ALTER TABLE `User` ADD COLUMN `isSandbox` BOOLEAN NOT NULL DEFAULT false;
