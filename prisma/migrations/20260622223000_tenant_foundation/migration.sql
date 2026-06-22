-- Cycle-022 T1: tenant foundation models and root tenant backfill.

CREATE TABLE "TenantPlan" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "limits" JSONB NOT NULL DEFAULT '{}',
    "remark" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TenantPlan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TenantPlanModule" (
    "planId" TEXT NOT NULL,
    "moduleCode" TEXT NOT NULL,

    CONSTRAINT "TenantPlanModule_pkey" PRIMARY KEY ("planId","moduleCode")
);

CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "planId" TEXT,
    "contactName" TEXT,
    "contactMobile" TEXT,
    "accountLimit" INTEGER,
    "expiresAt" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Tenant_status_check" CHECK ("status" IN ('active', 'suspended', 'expired'))
);

CREATE TABLE "TenantMembership" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "isOwner" BOOLEAN NOT NULL DEFAULT false,
    "deptId" TEXT,
    "invitedByUserId" TEXT,
    "joinedAt" TIMESTAMP(3),
    "lastActiveAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TenantMembership_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "TenantMembership_status_check" CHECK ("status" IN ('invited', 'active', 'suspended', 'left'))
);

CREATE TABLE "TenantMembershipRole" (
    "tenantId" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,

    CONSTRAINT "TenantMembershipRole_pkey" PRIMARY KEY ("tenantId","membershipId","roleId")
);

CREATE TABLE "TenantMembershipPost" (
    "tenantId" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,

    CONSTRAINT "TenantMembershipPost_pkey" PRIMARY KEY ("tenantId","membershipId","postId")
);

CREATE TABLE "PlatformRole" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "system" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformRole_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserPlatformRole" (
    "userId" TEXT NOT NULL,
    "platformRoleId" TEXT NOT NULL,

    CONSTRAINT "UserPlatformRole_pkey" PRIMARY KEY ("userId","platformRoleId")
);

CREATE TABLE "PlatformRolePermission" (
    "platformRoleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,

    CONSTRAINT "PlatformRolePermission_pkey" PRIMARY KEY ("platformRoleId","permissionId")
);

CREATE UNIQUE INDEX "TenantPlan_code_key" ON "TenantPlan"("code");
CREATE INDEX "TenantPlanModule_moduleCode_idx" ON "TenantPlanModule"("moduleCode");
CREATE UNIQUE INDEX "Tenant_code_key" ON "Tenant"("code");
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");
CREATE INDEX "Tenant_planId_idx" ON "Tenant"("planId");
CREATE INDEX "Tenant_status_expiresAt_idx" ON "Tenant"("status","expiresAt");
CREATE UNIQUE INDEX "TenantMembership_tenantId_userId_key" ON "TenantMembership"("tenantId","userId");
CREATE UNIQUE INDEX "TenantMembership_tenantId_id_key" ON "TenantMembership"("tenantId","id");
CREATE INDEX "TenantMembership_userId_status_idx" ON "TenantMembership"("userId","status");
CREATE INDEX "TenantMembership_deptId_idx" ON "TenantMembership"("deptId");
CREATE INDEX "TenantMembership_invitedByUserId_idx" ON "TenantMembership"("invitedByUserId");
CREATE INDEX "TenantMembershipRole_membershipId_idx" ON "TenantMembershipRole"("membershipId");
CREATE INDEX "TenantMembershipRole_roleId_idx" ON "TenantMembershipRole"("roleId");
CREATE INDEX "TenantMembershipPost_membershipId_idx" ON "TenantMembershipPost"("membershipId");
CREATE INDEX "TenantMembershipPost_postId_idx" ON "TenantMembershipPost"("postId");
CREATE UNIQUE INDEX "PlatformRole_code_key" ON "PlatformRole"("code");
CREATE INDEX "UserPlatformRole_platformRoleId_idx" ON "UserPlatformRole"("platformRoleId");
CREATE INDEX "PlatformRolePermission_permissionId_idx" ON "PlatformRolePermission"("permissionId");

ALTER TABLE "TenantPlanModule" ADD CONSTRAINT "TenantPlanModule_planId_fkey" FOREIGN KEY ("planId") REFERENCES "TenantPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_planId_fkey" FOREIGN KEY ("planId") REFERENCES "TenantPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TenantMembership" ADD CONSTRAINT "TenantMembership_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TenantMembership" ADD CONSTRAINT "TenantMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TenantMembership" ADD CONSTRAINT "TenantMembership_deptId_fkey" FOREIGN KEY ("deptId") REFERENCES "SystemDept"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TenantMembership" ADD CONSTRAINT "TenantMembership_invitedByUserId_fkey" FOREIGN KEY ("invitedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TenantMembershipRole" ADD CONSTRAINT "TenantMembershipRole_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TenantMembershipRole" ADD CONSTRAINT "TenantMembershipRole_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "TenantMembership"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TenantMembershipRole" ADD CONSTRAINT "TenantMembershipRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TenantMembershipPost" ADD CONSTRAINT "TenantMembershipPost_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TenantMembershipPost" ADD CONSTRAINT "TenantMembershipPost_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "TenantMembership"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TenantMembershipPost" ADD CONSTRAINT "TenantMembershipPost_postId_fkey" FOREIGN KEY ("postId") REFERENCES "SystemPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserPlatformRole" ADD CONSTRAINT "UserPlatformRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserPlatformRole" ADD CONSTRAINT "UserPlatformRole_platformRoleId_fkey" FOREIGN KEY ("platformRoleId") REFERENCES "PlatformRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlatformRolePermission" ADD CONSTRAINT "PlatformRolePermission_platformRoleId_fkey" FOREIGN KEY ("platformRoleId") REFERENCES "PlatformRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlatformRolePermission" ADD CONSTRAINT "PlatformRolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "TenantPlan" ("id", "code", "name", "enabled", "limits", "remark", "createdAt", "updatedAt")
VALUES (
    'tenant_plan_system_full',
    'system.full',
    'System Full',
    true,
    '{"accountLimit": 1000}'::jsonb,
    'Built-in full plan for the default root tenant.',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT ("code") DO UPDATE SET
    "name" = EXCLUDED."name",
    "enabled" = EXCLUDED."enabled",
    "limits" = EXCLUDED."limits",
    "remark" = EXCLUDED."remark",
    "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "Tenant" (
    "id",
    "code",
    "slug",
    "name",
    "status",
    "planId",
    "contactName",
    "accountLimit",
    "createdByUserId",
    "createdAt",
    "updatedAt"
)
SELECT
    'tenant_root',
    'root',
    'root',
    'Root Tenant',
    'active',
    'tenant_plan_system_full',
    'OpenCore Admin',
    1000,
    (SELECT "id" FROM "User" WHERE "username" = 'admin' LIMIT 1),
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
ON CONFLICT ("code") DO UPDATE SET
    "name" = EXCLUDED."name",
    "status" = EXCLUDED."status",
    "planId" = EXCLUDED."planId",
    "accountLimit" = EXCLUDED."accountLimit",
    "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "TenantMembership" (
    "id",
    "tenantId",
    "userId",
    "status",
    "isOwner",
    "deptId",
    "joinedAt",
    "createdAt",
    "updatedAt"
)
SELECT
    'tenant_membership_root_' || "User"."id",
    'tenant_root',
    "User"."id",
    CASE WHEN "User"."enabled" THEN 'active' ELSE 'suspended' END,
    "User"."username" = 'admin',
    "User"."deptId",
    "User"."createdAt",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "User"
ON CONFLICT ("tenantId", "userId") DO UPDATE SET
    "status" = EXCLUDED."status",
    "isOwner" = EXCLUDED."isOwner",
    "deptId" = EXCLUDED."deptId",
    "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "TenantMembershipRole" ("tenantId", "membershipId", "roleId")
SELECT
    'tenant_root',
    "TenantMembership"."id",
    "UserRole"."roleId"
FROM "UserRole"
JOIN "TenantMembership"
    ON "TenantMembership"."tenantId" = 'tenant_root'
   AND "TenantMembership"."userId" = "UserRole"."userId"
ON CONFLICT ("tenantId", "membershipId", "roleId") DO NOTHING;

INSERT INTO "TenantMembershipPost" ("tenantId", "membershipId", "postId")
SELECT
    'tenant_root',
    "TenantMembership"."id",
    "UserPost"."postId"
FROM "UserPost"
JOIN "TenantMembership"
    ON "TenantMembership"."tenantId" = 'tenant_root'
   AND "TenantMembership"."userId" = "UserPost"."userId"
ON CONFLICT ("tenantId", "membershipId", "postId") DO NOTHING;

INSERT INTO "PlatformRole" ("id", "code", "name", "enabled", "system", "createdAt", "updatedAt")
VALUES (
    'platform_role_admin',
    'platform-admin',
    'Platform Administrator',
    true,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT ("code") DO UPDATE SET
    "name" = EXCLUDED."name",
    "enabled" = EXCLUDED."enabled",
    "system" = EXCLUDED."system",
    "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "UserPlatformRole" ("userId", "platformRoleId")
SELECT "id", 'platform_role_admin'
FROM "User"
WHERE "username" = 'admin'
ON CONFLICT ("userId", "platformRoleId") DO NOTHING;
