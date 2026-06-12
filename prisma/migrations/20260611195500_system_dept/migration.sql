-- CreateTable
CREATE TABLE "SystemDept" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "leader" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemDept_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SystemDept_code_key" ON "SystemDept"("code");

-- CreateIndex
CREATE INDEX "SystemDept_parentId_order_idx" ON "SystemDept"("parentId", "order");

-- AddForeignKey
ALTER TABLE "SystemDept" ADD CONSTRAINT "SystemDept_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "SystemDept"("id") ON DELETE SET NULL ON UPDATE CASCADE;
