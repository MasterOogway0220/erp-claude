-- CreateTable: StoredFile — uploaded documents held in the database instead of
-- on disk. Vercel's filesystem is read-only outside /tmp and /tmp is wiped
-- between invocations, so disk-backed uploads were rejected or silently lost.
-- LONGBLOB takes up to 4 GB per row; this host allows a 1 GB max_allowed_packet
-- and the app caps an upload at 25 MB. Hand-written: this host blocks the
-- shadow DB that `prisma migrate dev` needs.
CREATE TABLE `StoredFile` (
    `id` VARCHAR(191) NOT NULL,
    `fileName` VARCHAR(191) NOT NULL,
    `mimeType` VARCHAR(191) NOT NULL,
    `originalSize` INTEGER NOT NULL,
    `size` INTEGER NOT NULL,
    `gzipped` BOOLEAN NOT NULL DEFAULT false,
    `data` LONGBLOB NOT NULL,
    `uploadedById` VARCHAR(191) NULL,
    `companyId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `StoredFile_companyId_idx`(`companyId`),
    INDEX `StoredFile_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
