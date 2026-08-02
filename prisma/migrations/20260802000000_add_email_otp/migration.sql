-- CreateTable: EmailOtp — one-time login codes for email 2FA. Purely additive,
-- nothing reads it until OTP_ENABLED=true. Hand-written: this host blocks the
-- shadow DB that `prisma migrate dev` needs, so migrations are authored then
-- `migrate deploy`d.
CREATE TABLE `EmailOtp` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `codeHash` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `consumedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `EmailOtp_email_createdAt_idx`(`email`, `createdAt`),
    INDEX `EmailOtp_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
