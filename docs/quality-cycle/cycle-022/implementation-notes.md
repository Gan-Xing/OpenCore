# OpenCore Cycle-022 Implementation Notes

Date: 2026-06-22

## Round 1: T1 Foundation Models and Root Tenant

### Completed

- Added Prisma models:
  - `TenantPlan`
  - `TenantPlanModule`
  - `Tenant`
  - `TenantMembership`
  - `TenantMembershipRole`
  - `TenantMembershipPost`
  - `PlatformRole`
  - `UserPlatformRole`
  - `PlatformRolePermission`
- Added migration `20260622223000_tenant_foundation`:
  - creates root `system.full` plan;
  - creates root tenant `tenant_root`;
  - creates root membership rows for existing users;
  - copies existing `UserRole` to `TenantMembershipRole`;
  - copies existing `UserPost` to `TenantMembershipPost`;
  - creates `platform-admin` role and binds existing `admin` user.
- Added repeatable `seedTenancy()`:
  - syncs root plan modules from module registry;
  - keeps root tenant and all current users backfilled;
  - assigns platform tenant permissions to `platform-admin`.
- Added module registry entries:
  - `core.tenant`
  - `core.tenant-plan`
  - `core.tenant-member`
- Added platform permission contract support:
  - `platform` layer;
  - `suspend` and `visit` actions;
  - targeted validator allowance for `core.tenant*` modules carrying `platform:*` permissions.
- Added API:
  - `GET /api/core/tenancy/foundation`
  - protected by `platform:tenant:read`
  - no body/query/header tenant selector.
- Added SDK:
  - `createTenancyClient`
  - `TenancyFoundationSummary` types.
- Added Admin:
  - `/system/tenants` read-only live page.
- Added verification:
  - tenant foundation guard
  - tenant foundation smoke

### Verification Log

Passed locally:

- Prisma schema validation, Client generation, migration deploy, and seed.
- Tenant foundation guard, route/access guard, i18n guard, SDK contract check, OpenAPI export/check, and registry tag check.
- Full repository lint, typecheck, and test suites.
- Refreshed deploy on API 39172 and Admin 39174.
- Tenant foundation smoke against local and public API.
- Public Admin `/system/tenants` route and tenant page bundle fetch.

### Remaining Product Debt

- T2 tenant-bound auth/session/request context.
- T3 tenant RBAC and org migration.
- T4 core tenant data isolation.
- T5 runtime propagation.
- T6 live Tenant Plan/Member control plane and platform visit audit.

### Deliberate Non-Goals

- No tenant CRUD.
- No front-end tenant switching.
- No token/session tenant binding yet.
- No rewrite of Role/Dept/Post/Dict/Config/File repositories yet.
- No Redis/file/queue/WebSocket/Integration tenant propagation yet.
