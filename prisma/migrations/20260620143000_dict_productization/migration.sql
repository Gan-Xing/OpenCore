-- Productize dictionary management: protected system dictionaries, display metadata,
-- and non-cascading dictionary item ownership.
ALTER TABLE "DictType"
  ADD COLUMN "remark" TEXT,
  ADD COLUMN "system" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "DictItem"
  ADD COLUMN "colorType" TEXT,
  ADD COLUMN "cssClass" TEXT,
  ADD COLUMN "remark" TEXT;

ALTER TABLE "DictItem" DROP CONSTRAINT IF EXISTS "DictItem_typeId_fkey";
ALTER TABLE "DictItem"
  ADD CONSTRAINT "DictItem_typeId_fkey"
  FOREIGN KEY ("typeId") REFERENCES "DictType"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "DictType_enabled_createdAt_idx" ON "DictType"("enabled", "createdAt");
CREATE INDEX "DictItem_typeId_enabled_sort_idx" ON "DictItem"("typeId", "enabled", "sort");
