-- AlterTable
ALTER TABLE "Menu" ADD COLUMN "parentKey" TEXT;
ALTER TABLE "Menu" ADD COLUMN "type" TEXT NOT NULL DEFAULT 'menu';
ALTER TABLE "Menu" ADD COLUMN "icon" TEXT;
ALTER TABLE "Menu" ADD COLUMN "component" TEXT;
ALTER TABLE "Menu" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'enabled';
ALTER TABLE "Menu" ADD COLUMN "cache" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Menu_parentKey_order_idx" ON "Menu"("parentKey", "order");

-- CreateIndex
CREATE INDEX "Menu_status_order_idx" ON "Menu"("status", "order");

-- AddForeignKey
ALTER TABLE "Menu" ADD CONSTRAINT "Menu_parentKey_fkey" FOREIGN KEY ("parentKey") REFERENCES "Menu"("key") ON DELETE SET NULL ON UPDATE CASCADE;
