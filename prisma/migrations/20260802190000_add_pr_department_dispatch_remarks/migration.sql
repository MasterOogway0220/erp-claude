-- AddColumn: the three PR basic-details fields the purchase workflow document
-- lists that had no home. `remarks` is the requester's general note —
-- approvalRemarks already existed but belongs to the approver, so the two were
-- being conflated. Department and dispatch address are both optional and point
-- at masters that already exist. Hand-written: this host blocks the shadow DB
-- that `prisma migrate dev` needs.
ALTER TABLE `PurchaseRequisition`
  ADD COLUMN `remarks` TEXT NULL,
  ADD COLUMN `departmentId` VARCHAR(191) NULL,
  ADD COLUMN `dispatchAddressId` VARCHAR(191) NULL;

CREATE INDEX `PurchaseRequisition_departmentId_idx` ON `PurchaseRequisition`(`departmentId`);
CREATE INDEX `PurchaseRequisition_dispatchAddressId_idx` ON `PurchaseRequisition`(`dispatchAddressId`);

ALTER TABLE `PurchaseRequisition`
  ADD CONSTRAINT `PurchaseRequisition_departmentId_fkey`
  FOREIGN KEY (`departmentId`) REFERENCES `DepartmentMaster`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `PurchaseRequisition`
  ADD CONSTRAINT `PurchaseRequisition_dispatchAddressId_fkey`
  FOREIGN KEY (`dispatchAddressId`) REFERENCES `CustomerDispatchAddress`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
