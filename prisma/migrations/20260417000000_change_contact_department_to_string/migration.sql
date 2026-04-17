-- AlterTable: Change CustomerContact.department from ENUM to VARCHAR
ALTER TABLE `CustomerContact` MODIFY `department` VARCHAR(191) NOT NULL DEFAULT 'OTHER';
