# cycle-020 Backend Self-Loop Backlog

Source prompt: `docs/quality-cycle/opencore-backend-self-loop.md`

Execution rule: implement OpenCore backend modules from lower dependency to
higher dependency. Do not jump to higher-level business modules before the lower
runtime packages are extracted and verified.

## Module Order

- [x] BE20-P01-COMMON: create `packages/common` as the framework-neutral backend
      primitive package for constants, guards, error codes, response contracts,
      pagination, sorting and bounded filter helpers.
- [x] BE20-P02-CORE: extract NestJS core platform primitives from
      `apps/api/src/platform` into `packages/core`, including exception filters,
      response interceptors, request context, OpenAPI helpers and API foundation
      setup.
- [x] BE20-P03-DATABASE: extract Prisma service/module and transaction/seed
      helpers into `packages/database`.
- [x] BE20-P04-REDIS: create `packages/redis` with Redis client abstraction, key
      naming, TTL policy and cache helpers.
- [x] BE20-P05-FILE: extract file storage abstraction into `packages/file` with
      local/MinIO-ready boundaries.
- [x] BE20-P06-SYSTEM-DICT: move dict runtime into the system package boundary.
- [x] BE20-P07-SYSTEM-CONFIG: move system config runtime into the system package
      boundary with secret redaction preserved.
- [x] BE20-P08-SYSTEM-NOTICE: implement system notices in dependency order,
      separate from collaboration notice if needed.
- [x] BE20-P09-SYSTEM-DEPT: implement department management.
- [x] BE20-P10-SYSTEM-POST: implement post/position management.
- [x] BE20-P11-SYSTEM-MENU: move menu runtime into the system package boundary.
- [x] BE20-P12-SYSTEM-ROLE: move role runtime into the system package boundary.
- [x] BE20-P13-SYSTEM-USER: move user runtime into the system package boundary.
- [x] BE20-P14-SECURITY-AUTH: extract auth/JWT/password/captcha boundaries into
      `packages/security`.
- [x] BE20-P15-SECURITY-RBAC: extract permission/role guards and decorators into
      `packages/security`.
- [x] BE20-P16-SECURITY-DATA-SCOPE: implement data-scope guard/decorator/query
      policy.
- [x] BE20-P17-AUDIT-LOGIN-LOG: extract login log boundary into
      `packages/audit`.
- [x] BE20-P18-AUDIT-OPERATION-LOG: extract operation log decorator/interceptor
      boundary into `packages/audit`.
- [x] BE20-P19-ONLINE-USER: complete online user package/runtime boundary.
- [x] BE20-P20-SCHEDULER: complete scheduler runtime with registry whitelist and
      job logs.
- [x] BE20-P21-MONITOR: extract monitor runtime into `packages/monitor`.
- [ ] BE20-P22-GENERATOR-CORE: extract generator core package.
- [ ] BE20-P23-TOOLS-GENERATOR: keep OpenForge CLI aligned with generator core.
- [ ] BE20-P24-API-AGGREGATION: keep `apps/api` limited to startup, HTTP entry,
      module aggregation and OpenAPI export.

## Common Round Acceptance

- [x] `@opencore/common` is recognized by Nx through `packages/common/project.json`.
- [x] `@opencore/common` is available through TypeScript path alias.
- [x] API platform code consumes common request header constants and error code
      normalization.
- [x] Common unit tests cover constants, guards, error codes, pagination,
      sorting, response contracts and bounded filter normalization.
- [x] Focused common lint/typecheck/test pass.
- [x] Full backend gate pass for this round.

## Core Round Acceptance

- [x] `@opencore/core` is recognized by Nx through `packages/core/project.json`.
- [x] `@opencore/core` is available through TypeScript path alias and lockfile
      importer metadata.
- [x] Request context, HTTP exception filtering, error response formatting,
      security header middleware, structured logging, OpenAPI helpers, OpenAPI
      drift comparison, standard OpenAPI decorators, response interceptor and
      API foundation setup live in `packages/core`.
- [x] `apps/api/src/main.ts`, OpenAPI export/check scripts, auth login context
      and audit interceptor consume `@opencore/core` directly.
- [x] Legacy `apps/api/src/platform` core implementation files are compatibility
      re-export shims instead of owning reusable platform logic.
- [x] Focused core lint/typecheck/test pass.
- [x] Full backend gate pass after the core migration.

## Database Round Acceptance

- [x] `@opencore/database` is recognized by Nx through
      `packages/database/project.json`.
- [x] `@opencore/database` is available through TypeScript path alias and
      lockfile importer metadata.
- [x] Prisma client factory, `PrismaService`, `DatabaseModule`, transaction
      helper and seed step runner live in `packages/database`.
- [x] `apps/api` modules, repositories, audit interceptor and tests import
      `DatabaseModule`/`PrismaService` from `@opencore/database`.
- [x] Legacy `apps/api/src/platform/database` files are compatibility re-export
      shims instead of owning database implementation.
- [x] Focused database lint/typecheck/test pass.
- [x] Full backend gate pass after the database migration.

## Redis Round Acceptance

- [x] `@opencore/redis` is recognized by Nx through `packages/redis/project.json`.
- [x] `@opencore/redis` is available through TypeScript path alias and lockfile
      importer metadata.
- [x] Redis options, local env loading, client factory, client adapter,
      `RedisService`, `RedisModule`, key naming, TTL policy and JSON cache helper
      live in `packages/redis`.
- [x] BullMQ Redis connection options are generated from the Redis package.
- [x] Monitor runtime diagnostics uses `@opencore/redis` for Redis and BullMQ
      connection construction.
- [x] Focused redis lint/typecheck/test pass.
- [x] Full backend gate pass after the redis migration.

## File Round Acceptance

- [x] `@opencore/file` is recognized by Nx through `packages/file/project.json`.
- [x] `@opencore/file` is available through TypeScript path alias and lockfile
      importer metadata.
- [x] File storage options/env, object key naming, safe file validation, storage
      port, local storage adapter, MinIO/S3 storage adapter, S3 prefix probe,
      `FileStorageService` and `FileModule` live in `packages/file`.
- [x] System file asset metadata uses `@opencore/file` for deterministic object
      key creation and safe file validation.
- [x] Monitor runtime diagnostics uses `@opencore/file` for S3 prefix probing
      instead of constructing MinIO clients in `apps/api`.
- [x] Focused file lint/typecheck/test pass.
- [x] Full backend gate pass after the file migration.

## System Dict Round Acceptance

- [x] `@opencore/system` is recognized by Nx through `packages/system/project.json`.
- [x] `@opencore/system` is available through TypeScript path alias and
      lockfile importer metadata.
- [x] System dictionary DTOs, seed records, repository contract, seed
      repository, Prisma repository, service, module and export preview helper
      live in `packages/system` under the system-dict boundary.
- [x] `apps/api` dictionary routes consume `SystemDictService` from
      `@opencore/system`; legacy system-management repositories no longer own
      dictionary CRUD.
- [x] Prisma seeding imports dictionary seed data from `@opencore/system`.
- [x] Focused system-dict lint/typecheck/test pass.
- [x] Full backend gate pass after the system-dict migration.

## System Config Round Acceptance

- [x] `@opencore/system` contains a `system-config` boundary in dependency
      order after `system-dict`.
- [x] System config DTOs, seed records, repository contract, seed repository,
      Prisma repository, service, module, secret-key safety and export preview
      helper live in `packages/system`.
- [x] Secret-like config keys require explicit `secret` visibility and secret
      config values are redacted in create/list/update responses.
- [x] `apps/api` config routes consume `SystemConfigService` from
      `@opencore/system`; legacy system-management repositories no longer own
      config CRUD/export.
- [x] Prisma seeding imports system config seed data from `@opencore/system`.
- [x] Focused system-config lint/typecheck/test pass.
- [x] Full backend gate pass after the system-config migration.

## System Notice Round Acceptance

- [x] `@opencore/system` contains a `system-notice` boundary in dependency
      order after `system-config`.
- [x] System notice DTOs, seed records, repository contract, seed repository,
      Prisma repository, service, module, export preview helper and lifecycle
      guards live in `packages/system`.
- [x] System notices use a dedicated `SystemNotice` Prisma model and migration;
      they do not reuse or couple to `CollaborationNotice`.
- [x] Draft, publish and archive lifecycle rules are package-level tested,
      including invalid schedule rejection.
- [x] `apps/api` notice routes consume `SystemNoticeService` from
      `@opencore/system`; legacy system-management repositories remain limited
      to file/audit/login runtime.
- [x] Module registry contains `core.notice` permissions and OpenAPI tag
      coverage without introducing Admin route/access drift.
- [x] Prisma seeding imports system seed records from the records-only
      `@opencore/system/records` entrypoint.
- [x] Focused system-notice lint/typecheck/test pass.
- [x] Full backend gate pass after the system-notice migration.

## System Dept Round Acceptance

- [x] `@opencore/system` contains a `system-dept` boundary in dependency order
      after `system-notice`.
- [x] System dept DTOs, seed records, repository contract, seed repository,
      Prisma repository, service, module, tree builder, cycle guards and export
      preview helper live in `packages/system`.
- [x] Department management uses a dedicated `SystemDept` Prisma tree model and
      migration without binding users yet.
- [x] Department create/update/delete behavior is package-level tested,
      including self-parent/cycle rejection and parent-with-children deletion
      rejection.
- [x] `apps/api` dept routes consume `SystemDeptService` from
      `@opencore/system`; legacy system-management repositories remain limited
      to file/audit/login runtime.
- [x] Module registry contains `core.dept` permissions and OpenAPI tag coverage
      without introducing Admin route/access drift.
- [x] Prisma seeding imports system dept seed records from the records-only
      `@opencore/system/records` entrypoint.
- [x] Focused system-dept lint/typecheck/test pass.
- [x] Full backend gate pass after the system-dept migration.

## System Post Round Acceptance

- [x] `@opencore/system` contains a `system-post` boundary in dependency order
      after `system-dept`.
- [x] System post DTOs, seed records, repository contract, seed repository,
      Prisma repository, service, module, pagination helpers and export preview
      helper live in `packages/system`.
- [x] Post/position management uses a dedicated `SystemPost` Prisma model and
      migration without binding users yet.
- [x] Post create/update/delete behavior is package-level tested, including
      invalid code and invalid order rejection.
- [x] `apps/api` post routes consume `SystemPostService` from
      `@opencore/system`; legacy system-management repositories remain limited
      to file/audit/login runtime.
- [x] Module registry contains `core.post` permissions and OpenAPI tag coverage
      without introducing Admin route/access drift.
- [x] Prisma seeding imports system post seed records from the records-only
      `@opencore/system/records` entrypoint.
- [x] Focused system-post lint/typecheck/test pass.
- [x] Full backend gate pass after the system-post migration.

## System Menu Round Acceptance

- [x] `@opencore/system` contains a `system-menu` boundary in dependency order
      after `system-post`.
- [x] System menu DTOs, registry-backed seed records, repository contract, seed
      repository, Prisma repository, service, module and export preview helper
      live in `packages/system`.
- [x] Menu management reuses the existing `Menu` Prisma model and preserves the
      registry stage metadata used by the S6 menu contract.
- [x] Menu create/update/delete behavior is package-level tested, including
      invalid key, invalid path and invalid order rejection.
- [x] Existing `/api/core/menus` routes consume `SystemMenuService` from
      `@opencore/system`; legacy RBAC repositories no longer own menu
      CRUD/export.
- [x] RBAC permission deletion still clears `Menu.permissionId` before deleting
      a permission, preserving referential integrity while role/user/permission
      runtime remains in RBAC for later rounds.
- [x] Prisma seeding still writes registry menus and passes with the system
      records-only entrypoint loaded.
- [x] Focused system-menu lint/typecheck/test pass.
- [x] Full backend gate pass after the system-menu migration.

## System Role Round Acceptance

- [x] `@opencore/system` contains a `system-role` boundary in dependency order
      after `system-menu`.
- [x] System role DTOs, registry-backed seed records, repository contract, seed
      repository, Prisma repository, service, module and export preview helper
      live in `packages/system`.
- [x] Role management reuses the existing `Role`, `RolePermission` and
      `UserRole` Prisma models, with permission-code validation preserved.
- [x] Role create/update/delete behavior is package-level tested, including
      invalid code rejection, duplicate permission-code rejection, system-role
      deletion protection and system-role demotion protection.
- [x] Existing `/api/core/roles` routes consume `SystemRoleService` from
      `@opencore/system`; legacy RBAC repositories no longer own role
      CRUD/export.
- [x] RBAC repositories still use role data internally for user role assignment
      validation and permission lookup until the later system-user/security
      rounds move those dependencies.
- [x] Prisma seeding imports seeded roles from the records-only
      `@opencore/system/records` entrypoint.
- [x] Focused system-role lint/typecheck/test pass.
- [x] Full backend gate pass after the system-role migration.

## System User Round Acceptance

- [x] `@opencore/system` contains a `system-user` boundary in dependency order
      after `system-role`.
- [x] System user DTOs, seed records, repository contract, seed repository,
      Prisma repository, service, module, password hash helper and export
      preview helper live in `packages/system`.
- [x] User management reuses the existing `User` and `UserRole` Prisma models,
      with role-code validation preserved through existing `Role` records.
- [x] User create/update/delete behavior is package-level tested, including
      invalid username rejection, duplicate role-code rejection, missing-role
      rejection, password hashing and user-role cleanup on delete.
- [x] Existing `/api/core/users` routes consume `SystemUserService` from
      `@opencore/system`; legacy RBAC repositories no longer own user
      CRUD/export.
- [x] RBAC repositories still read user records for login/session validation and
      permission lookup until the later security-auth/security-rbac rounds move
      those responsibilities.
- [x] Prisma seeding imports seeded users from the records-only
      `@opencore/system/records` entrypoint while preserving
      `BOOTSTRAP_ADMIN_PASSWORD` for the admin password.
- [x] Focused system-user lint/typecheck/test pass.
- [x] Full backend gate pass after the system-user migration.

## Security Auth Round Acceptance

- [x] `@opencore/security` is recognized by Nx through
      `packages/security/project.json`.
- [x] `@opencore/security` is available through TypeScript path alias and
      lockfile importer metadata.
- [x] Authentication user repository port, login/session service, bearer token
      signing/verification, password hashing and dynamic auth module live in the
      `security-auth` boundary under `packages/security`.
- [x] Existing `AuthService` imports remain behavior-compatible through API
      re-export shims while the implementation lives in `@opencore/security`.
- [x] `RbacRepository` now implements the security auth user port and the API
      module maps that port to the existing RBAC Prisma/seed repositories.
- [x] System-user password hashing now delegates to `@opencore/security`, so
      user create/update and auth login use the same password helper.
- [x] Security-auth unit tests cover password hashing, bearer token
      sign/verify/reject paths, login success/failure logging and disabled-user
      rejection.
- [x] Focused security-auth lint/typecheck/test pass.
- [x] Full backend gate pass after the security-auth migration.

## Security RBAC Round Acceptance

- [x] `@opencore/security` contains a `security-rbac` boundary in dependency
      order after `security-auth`.
- [x] Permission metadata decorator, role metadata decorator, permission guard,
      role guard and authenticated request type live in `packages/security`.
- [x] Existing API `RequirePermission` and `PermissionGuard` imports remain
      behavior-compatible through re-export shims while the implementation lives
      in `@opencore/security`.
- [x] The API RBAC module registers both security permission and role guards as
      global Nest guards, with route authorization still driven by metadata.
- [x] Security RBAC guards reuse the authenticated user already attached to the
      request when present, avoiding duplicate token validation when guards are
      composed.
- [x] Security-rbac unit tests cover metadata decorators, permission allow/deny,
      missing bearer rejection, role allow/deny and request-user reuse.
- [x] Focused security-rbac lint/typecheck/test pass.
- [x] Full backend gate pass after the security-rbac migration.

## Security Data Scope Round Acceptance

- [x] `@opencore/security` contains a `security-data-scope` boundary in
      dependency order after `security-rbac`.
- [x] Data-scope metadata decorator, global guard, request context type,
      repository port, constraint resolver and reusable query-policy helpers
      live in `packages/security`.
- [x] Role/user data-scope state is persisted through Prisma with role
      `dataScope`/`dataScopeDeptIds`, optional user `deptId`, and a user to
      `SystemDept` relation.
- [x] System role/user package records, DTOs, seed repositories and Prisma
      repositories preserve and validate data-scope/dept fields.
- [x] Prisma seeding writes role data-scope configuration and user department
      ownership after departments are present.
- [x] API RBAC repositories implement the security data-scope repository port
      for Prisma and seed runtimes, including department descendant lookup.
- [x] The API RBAC module registers the security data-scope guard globally,
      inert unless `RequireDataScope` metadata is present.
- [x] Security-data-scope unit tests cover decorator metadata, all/restricted
      constraints, query filter creation, filter merging, guard attach behavior
      and missing bearer rejection.
- [x] Focused security-data-scope lint/typecheck/test pass.
- [x] Full backend gate pass after the security-data-scope migration.

## Audit Login Log Round Acceptance

- [x] `@opencore/audit` is recognized by Nx through
      `packages/audit/project.json`.
- [x] `@opencore/audit` is available through TypeScript path aliases, package
      metadata and records-only entrypoint `@opencore/audit/records`.
- [x] Login log DTOs, seed records, repository contract, seed repository,
      Prisma repository, service, module and export preview helper live in the
      `audit-login-log` boundary under `packages/audit`.
- [x] Login log runtime reuses the existing `LoginLog` Prisma model while
      moving seed records out of the legacy API system-management boundary.
- [x] `SecurityAuthService` records login attempts through a dedicated
      `SecurityLoginAttemptRecorder` port instead of requiring RBAC
      repositories to write login logs.
- [x] `AuditLoginLogModule` provides the login-attempt recorder through the
      Prisma audit repository, and the API RBAC module imports it for auth
      login success/failure recording.
- [x] Existing `/api/core/login-logs` routes remain behavior-compatible in API
      aggregation but delegate read/export behavior to `AuditLoginLogService`.
- [x] Login log list/export supports username and success filters in addition
      to bounded pagination.
- [x] Audit-login-log tests cover seed list/filter/record/export behavior and
      Prisma read/write integration.
- [x] Focused audit-login-log lint/typecheck/test pass.
- [x] Full backend gate pass after the audit-login-log migration.

## Audit Operation Log Round Acceptance

- [x] `@opencore/audit` contains an `audit-operation-log` boundary in
      dependency order after `audit-login-log`.
- [x] Operation log DTOs, seed records, repository contract, seed repository,
      Prisma repository, service, module, decorators, interceptor and export
      preview helper live in `packages/audit`.
- [x] Operation log runtime reuses the existing `AuditLog` Prisma model while
      moving seed records out of the legacy API system-management boundary.
- [x] Existing `/api/core/audit-logs` routes remain behavior-compatible in API
      aggregation but delegate read/export behavior to
      `AuditOperationLogService`.
- [x] `AuditOperationLogInterceptor` is registered from the audit package as
      the global APP_INTERCEPTOR, with the old API platform interceptor file
      preserved as a compatibility re-export shim.
- [x] Operation log list/export supports actor username, action and resource
      filters in addition to bounded pagination.
- [x] Operation metadata redaction remains recursive for authorization,
      cookie, password, secret and token-like keys.
- [x] Audit-operation-log tests cover decorator metadata, redaction, seed
      list/filter/record/export behavior, interceptor success/skip/error paths
      and Prisma read/write integration.
- [x] Focused audit-operation-log lint/typecheck/test pass.
- [x] Full backend gate pass after the audit-operation-log migration.

## Online User Round Acceptance

- [x] `@opencore/online-user` is recognized by Nx through
      `packages/online-user/project.json`.
- [x] `@opencore/online-user` is available through TypeScript path aliases,
      package metadata and records-only entrypoint
      `@opencore/online-user/records`.
- [x] Online-user DTOs, seed records, repository contract, seed repository,
      Prisma repository, service, module, bounded filters and summary helper
      live in `packages/online-user`.
- [x] Online-user runtime owns list/detail/kick-out behavior and active/revoked
      summary; API operations routes delegate to `OnlineUserService`.
- [x] Prisma migration `20260611230000_online_user_revoke_audit` creates the
      online-user table for older local databases and persists kick-out
      `revokedBy` / `revokedReason` audit context.
- [x] Prisma seed imports online-user sessions from
      `@opencore/online-user/records`.
- [x] Existing `/api/monitor/online-users` routes remain behavior-compatible in
      API aggregation, with username and active filters.
- [x] Operations summary composes online-user counts through
      `OnlineUserService` instead of querying online sessions in the operations
      repository.
- [x] Online-user tests cover seed list/filter/summary/kick-out behavior and
      Prisma read/write persistence for revoke audit fields.
- [x] Focused online-user lint/typecheck/test pass.
- [x] Full backend gate pass after the online-user migration.

## Scheduler Round Acceptance

- [x] `@opencore/scheduler` is recognized by Nx through
      `packages/scheduler/project.json`.
- [x] `@opencore/scheduler` is available through TypeScript path aliases,
      package metadata and records-only entrypoint
      `@opencore/scheduler/records`.
- [x] Scheduler DTOs, seed records, registry whitelist, repository contract,
      seed repository, Prisma repository, service, module, bounded filters,
      summary helpers and BullMQ adapter metadata live in `packages/scheduler`.
- [x] Scheduler runtime owns job definition list/detail/create/update,
      enable/disable, manual trigger and run-log read behavior.
- [x] Job creation/update/trigger is constrained by the scheduler registry
      whitelist, registered queue name, cron validation, retry bounds and
      timeout bounds.
- [x] Existing `/api/monitor/jobs` routes remain behavior-compatible in API
      aggregation but delegate to `SchedulerService`.
- [x] Operations summary composes job and run-log counts through
      `SchedulerService` instead of querying scheduler tables in the
      operations repository.
- [x] Prisma migration `20260611233000_scheduler_runtime` creates the scheduler
      runtime tables for older local databases.
- [x] Prisma seed imports scheduler jobs and run logs from
      `@opencore/scheduler/records`.
- [x] Scheduler tests cover seed list/filter/summary/trigger behavior,
      registry safety checks, cron/numeric policy validation and Prisma
      read/write persistence.
- [x] Focused scheduler/api/sdk lint/typecheck/test pass.
- [x] Full backend gate pass after the scheduler migration.

## Monitor Round Acceptance

- [x] `@opencore/monitor` is recognized by Nx through
      `packages/monitor/project.json`.
- [x] `@opencore/monitor` is available through TypeScript path aliases,
      package metadata and records-only entrypoint
      `@opencore/monitor/records`.
- [x] Monitor DTOs, health service, runtime diagnostics, repository, service,
      module and monitor queue records live in `packages/monitor`.
- [x] Monitor runtime owns health response generation, dependency status
      summary, version metadata and read-only BullMQ queue status.
- [x] Runtime diagnostics probes PostgreSQL, Redis, BullMQ queues and S3
      without leaking connection strings, secrets or bucket credentials.
- [x] Existing `/api/health/live`, `/api/health/ready`,
      `/api/monitor/status`, `/api/monitor/version` and
      `/api/monitor/queues` routes remain behavior-compatible in API
      aggregation.
- [x] API monitoring files are thin controller/re-export shims instead of
      owning reusable monitor runtime logic.
- [x] Monitor tests cover health probes, dependency degradation, safe version
      metadata, read-only queue status and runtime diagnostics integration.
- [x] Focused monitor/api/sdk lint/typecheck/test pass.
- [x] Full backend gate pass after the monitor migration.
