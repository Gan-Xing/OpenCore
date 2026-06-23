ALTER TABLE "User" ADD COLUMN "legacyDeptTenantId" TEXT NOT NULL DEFAULT 'tenant_root';
ALTER TABLE "UserRole" ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT 'tenant_root';
ALTER TABLE "UserPost" ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT 'tenant_root';

ALTER TABLE "User" DROP CONSTRAINT "User_deptId_fkey";
ALTER TABLE "UserRole" DROP CONSTRAINT "UserRole_roleId_fkey";
ALTER TABLE "UserPost" DROP CONSTRAINT "UserPost_postId_fkey";

ALTER TABLE "User"
  ADD CONSTRAINT "User_legacyDeptTenantId_root_check"
  CHECK ("legacyDeptTenantId" = 'tenant_root');

ALTER TABLE "UserRole"
  ADD CONSTRAINT "UserRole_tenantId_root_check"
  CHECK ("tenantId" = 'tenant_root');

ALTER TABLE "UserPost"
  ADD CONSTRAINT "UserPost_tenantId_root_check"
  CHECK ("tenantId" = 'tenant_root');

CREATE INDEX "User_legacyDeptTenantId_deptId_idx" ON "User"("legacyDeptTenantId", "deptId");
CREATE INDEX "UserRole_tenantId_idx" ON "UserRole"("tenantId");
CREATE INDEX "UserPost_tenantId_idx" ON "UserPost"("tenantId");

ALTER TABLE "User"
  ADD CONSTRAINT "User_legacyDeptTenantId_deptId_fkey"
  FOREIGN KEY ("legacyDeptTenantId", "deptId")
  REFERENCES "SystemDept"("tenantId", "id")
  ON DELETE RESTRICT
  ON UPDATE CASCADE;

ALTER TABLE "UserRole"
  ADD CONSTRAINT "UserRole_tenantId_roleId_fkey"
  FOREIGN KEY ("tenantId", "roleId")
  REFERENCES "Role"("tenantId", "id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;

ALTER TABLE "UserPost"
  ADD CONSTRAINT "UserPost_tenantId_postId_fkey"
  FOREIGN KEY ("tenantId", "postId")
  REFERENCES "SystemPost"("tenantId", "id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;
