-- Add recycle-bin support for productized dictionaries.
ALTER TABLE "DictType" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "DictItem" ADD COLUMN "deletedAt" TIMESTAMP(3);

CREATE INDEX "DictType_deletedAt_createdAt_idx" ON "DictType"("deletedAt", "createdAt");
CREATE INDEX "DictItem_deletedAt_updatedAt_idx" ON "DictItem"("deletedAt", "updatedAt");
