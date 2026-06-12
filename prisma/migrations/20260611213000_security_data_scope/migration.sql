-- Add role data-scope settings and optional user department ownership.
ALTER TABLE "Role"
ADD COLUMN "dataScope" TEXT NOT NULL DEFAULT 'all',
ADD COLUMN "dataScopeDeptIds" JSONB;

ALTER TABLE "User"
ADD COLUMN "deptId" TEXT;

CREATE INDEX "User_deptId_idx" ON "User"("deptId");

ALTER TABLE "User"
ADD CONSTRAINT "User_deptId_fkey"
FOREIGN KEY ("deptId") REFERENCES "SystemDept"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
