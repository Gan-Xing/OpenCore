# cycle-020 Backend Self-Loop Implementation Notes

Started: 2026-06-11 18:07:24 UTC

## Current State Audit

- The active backend self-loop prompt requires module implementation in strict
  dependency order from common/core/database upward.
- Current repository evidence shows most runtime backend code still lives under
  `apps/api/src/platform` and `apps/api/src/modules`, while reusable runtime
  packages such as `packages/common`, `packages/core`, `packages/database`,
  `packages/redis`, `packages/file`, `packages/system`, `packages/security` and
  `packages/audit` are not yet present as package boundaries.
- Existing `packages/shared` contains a small S3-era helper set, but it does not
  provide the backend common contract requested by the self-loop prompt.

## This Round Module

Module: `packages/common`

Dependency level: lowest.

Why this module: all higher runtime packages need a framework-neutral place for
stable constants, guards, error codes, response contracts, pagination and
bounded query helpers. Implementing it first avoids keeping those primitives
inside `apps/api`.

## Implemented

- Added `@opencore/common` as an Nx workspace library with package metadata,
  TypeScript configs, Jest config and README.
- Added stable request context header constants:
  `REQUEST_ID_HEADER` and `TRACE_ID_HEADER`.
- Added framework-neutral runtime guards:
  `isRecord`, `isNonEmptyString` and deterministic duplicate detection.
- Added error code helpers:
  `ERROR_CODES`, `sanitizeErrorCode`, `createHttpErrorCode` and
  `errorCodeFromHttpStatus`.
- Added common response contracts and builders:
  `ApiSuccessResponse`, `ApiErrorResponse`, `createSuccessResponse` and
  `createErrorResponse`.
- Added pagination/sort helpers:
  `normalizePagination`, `createPageResult` and `normalizeSort`.
- Added bounded filter helpers:
  `normalizeOptionalString`, `normalizeOptionalBoolean`,
  `normalizeOptionalNumber`, `normalizeStringArray` and `normalizeFilters`.
- Added `@opencore/common` to `tsconfig.base.json` path aliases.
- Refactored API platform code to consume common primitives:
  - `apps/api/src/platform/errors/error-response.ts` now uses
    `errorCodeFromHttpStatus` and `isRecord`.
  - `apps/api/src/platform/request-context/request-context.middleware.ts` now
    uses common request/trace header constants.

## Focused Verification

- Passed: `NX_DAEMON=false pnpm nx test common`
- Passed: `NX_DAEMON=false pnpm nx typecheck common`
- Passed: `NX_DAEMON=false pnpm nx lint common`
- Passed:
  `NX_DAEMON=false pnpm nx test api --runInBand --runTestsByPath src/platform/errors/error-response.spec.ts src/platform/request-context/request-context.middleware.spec.ts`

## Full Round Verification

- Passed: `pnpm typecheck`
- Passed: `pnpm lint`
- Passed: `pnpm test`
- Passed: `pnpm build:api`
- Passed: `pnpm prisma:validate`
- Passed: `pnpm openapi:check`
- Passed: `pnpm format:check`

Notes:

- `pnpm lint` still reports existing Admin Biome style hints in
  `apps/admin/scripts/smoke-test.mjs` and
  `apps/admin/src/pages/shared/CurrentPageExportButton.tsx`, but the command
  exits successfully. Those files were not touched in this backend common round.
- `pnpm build:api` ran `common:build` in the dependency chain, proving the API
  build recognizes the new common package.

## RuoYi/Yudao Reference Points

- Kept RuoYi/Yudao-style shared backend primitives:统一响应、统一错误码、分页、
  白名单过滤基础能力。
- Did not copy Java utility classes or MyBatis query conventions; the
  implementation is plain TypeScript and framework-neutral so Nest packages can
  compose it cleanly.

## TS/NestJS Best-Practice Choice

- `packages/common` has no NestJS dependency. Nest-specific filters,
  decorators, interceptors and OpenAPI helpers belong in the next module:
  `packages/core`.
- Query normalization is whitelist/schema based instead of arbitrary dynamic
  filter pass-through.
- Pagination clamps page size centrally to avoid unbounded list contracts.

## Next Module

Next lowest incomplete module after common: `packages/core`.

---

## Core Round Module

Module: `packages/core`

Dependency level: second-lowest, after `packages/common`.

Why this module: NestJS-specific platform primitives must be reusable by
runtime packages while `apps/api` stays focused on startup, HTTP entry, module
aggregation and OpenAPI export.

## Core Implemented

- Added `@opencore/core` as an Nx workspace library with package metadata,
  TypeScript configs, Jest config and README.
- Migrated request context and request context middleware into core.
- Migrated API error response formatting and `HttpExceptionFilter` into core.
- Migrated security header middleware and CORS/security baseline setup into
  core.
- Migrated structured JSON logger into core.
- Migrated OpenAPI config/document/setup helpers and OpenAPI drift comparison
  into core.
- Added reusable OpenAPI base decorators:
  `ApiStandardErrorResponses` and `ApiPaginatedResponse`.
- Added `ApiResponseInterceptor` as a reusable success-envelope interceptor with
  double-wrap protection. It is exported for admitted modules but not globally
  enabled in `apps/api` during this migration, avoiding a breaking API response
  shape change before SDK/Admin contracts are updated.
- Added `applyApiFoundation` to core for global prefix, request context,
  security baseline and exception filter setup.
- Added `@opencore/core` to `tsconfig.base.json` path aliases and refreshed
  `pnpm-lock.yaml` importer metadata.
- Updated API runtime imports:
  - `apps/api/src/main.ts`
  - `apps/api/src/platform/openapi/export-openapi.ts`
  - `apps/api/src/platform/openapi/check-openapi-drift.ts`
  - `apps/api/src/modules/core/rbac/auth.controller.ts`
  - `apps/api/src/platform/audit/audit-log.interceptor.ts`
- Replaced legacy core implementation files under `apps/api/src/platform` with
  compatibility re-export shims.

## Core Focused Verification

- Passed: `NX_DAEMON=false pnpm nx test core`
- Passed: `NX_DAEMON=false pnpm nx typecheck core`
- Passed: `NX_DAEMON=false pnpm nx lint core`
- Passed:
  `NX_DAEMON=false pnpm nx test api --runInBand --runTestsByPath src/platform/errors/error-response.spec.ts src/platform/request-context/request-context.middleware.spec.ts src/platform/security/security.spec.ts src/platform/logging/structured-logger.spec.ts src/platform/openapi/openapi-drift.spec.ts`

## Core Full Round Verification

- Passed: `NX_DAEMON=false pnpm nx show projects` confirmed 9 projects:
  `admin`, `api`, `common`, `contracts`, `core`, `module-registry`,
  `openforge`, `sdk`, `shared`.
- Passed: `pnpm typecheck`
- Passed: `pnpm lint`
- Passed: `pnpm test`
- Passed: `pnpm build:api`
- Passed: `pnpm prisma:validate`
- Passed: `pnpm openapi:check`
- Passed: `pnpm format:check`

Notes:

- `pnpm lint` still reports the same existing Admin Biome style hints in
  `apps/admin/scripts/smoke-test.mjs` and
  `apps/admin/src/pages/shared/CurrentPageExportButton.tsx`; command exit code
  remains 0 and these files were not changed by the backend core migration.
- `pnpm build:api` ran `core:build` in the dependency chain, proving the API
  build recognizes the new core package.

## Core RuoYi/Yudao Reference Points

- Preserved the familiar platform loop: global exception handling, request
  tracing, unified error envelope, pagination OpenAPI helper, security headers
  and OpenAPI drift checks.
- Did not copy Spring AOP or interceptor structure. The implementation uses
  NestJS filter/interceptor/decorator primitives and plain TypeScript helpers.

## Core TS/NestJS Best-Practice Choice

- Core depends on NestJS and Swagger, while framework-neutral concerns remain in
  `@opencore/common`.
- Success response wrapping is packaged as an interceptor but not enabled
  globally yet. That keeps this dependency-layer migration behavior-preserving
  until SDK/Admin response contracts are admitted for a breaking envelope change.
- `apps/api/src/platform` keeps only temporary re-export shims for existing tests
  and imports; new code should import `@opencore/core` directly.

## Next Module After Core

Next lowest incomplete module after core: `packages/database`.

---

## Database Round Module

Module: `packages/database`

Dependency level: third-lowest, after `packages/common` and `packages/core`.

Why this module: all persistent repositories need a reusable Prisma/PostgreSQL
boundary before Redis, file storage, system and security modules can be
completed cleanly outside `apps/api`.

## Database Implemented

- Added `@opencore/database` as an Nx workspace library with package metadata,
  TypeScript configs, Jest config and README.
- Added `DatabaseOptions`, `DATABASE_OPTIONS`, `DEFAULT_DATABASE_URL` and
  `readDatabaseOptionsFromEnv`.
- Added Prisma/PostgreSQL factory helpers:
  `createPrismaPgAdapter` and `createPrismaClient`.
- Added `PrismaService` with Nest module destroy lifecycle support.
- Added `DatabaseModule` with default env-backed provider setup plus
  `forRoot`/`forRootAsync` dynamic module entrypoints.
- Added silent `.env.opencore.local` loading in the database package so direct
  Prisma integration tests keep the previous runtime behavior without importing
  `apps/api` config.
- Added `runInPrismaTransaction` and `PrismaTransactionClient` helper exports.
- Added `runDatabaseSeedSteps` for deterministic seed step orchestration.
- Added `@opencore/database` to `tsconfig.base.json` path aliases and refreshed
  `pnpm-lock.yaml` importer metadata.
- Updated API runtime imports:
  - `apps/api/src/app/app.module.ts`
  - `apps/api/src/platform/audit/audit-log.interceptor.ts`
  - core RBAC/system-management Prisma repositories and specs
  - collaboration/integration/monitor Prisma repositories
  - monitoring runtime diagnostics service and spec
  - modules that import `DatabaseModule`
- Replaced legacy database implementation files under `apps/api/src/platform`
  with compatibility re-export shims.

## Database Focused Verification

- Passed: `NX_DAEMON=false pnpm nx test database`
- Passed: `NX_DAEMON=false pnpm nx typecheck database`
- Passed: `NX_DAEMON=false pnpm nx lint database`
- Passed: `NX_DAEMON=false pnpm nx typecheck api`
- Passed:
  `NX_DAEMON=false pnpm nx test api --runInBand --runTestsByPath src/platform/openapi/openapi.spec.ts src/app/health.controller.spec.ts src/platform/audit/audit-log.interceptor.spec.ts`
- Passed:
  `NX_DAEMON=false pnpm nx test api --runInBand --runTestsByPath src/modules/core/rbac/prisma-rbac.repository.spec.ts src/modules/core/system-management/prisma-system-management.repository.spec.ts src/modules/monitor/monitoring/runtime-diagnostics.service.spec.ts`

## Database Full Round Verification

- Passed: `pnpm typecheck`
- Passed: `pnpm lint`
- Passed: `pnpm test`
- Passed: `pnpm build:api`
- Passed: `pnpm prisma:validate`
- Passed: `pnpm openapi:check`
- Passed: `pnpm format:check`

Notes:

- `pnpm lint` still reports the same existing Admin Biome style hints in
  `apps/admin/scripts/smoke-test.mjs` and
  `apps/admin/src/pages/shared/CurrentPageExportButton.tsx`; command exit code
  remains 0 and these files were not changed by the backend database migration.
- `pnpm build:api` ran `database:build` in the dependency chain, proving the API
  build recognizes the new database package.
- An initial full `pnpm test` attempt failed because direct Prisma integration
  tests no longer loaded `.env.opencore.local` after moving PrismaService out of
  `apps/api`. The fix moved silent local env loading into
  `@opencore/database`, then the focused Prisma integration tests and full
  `pnpm test` passed.

## Database RuoYi/Yudao Reference Points

- Preserved the RuoYi/Yudao idea of a centralized database/runtime persistence
  boundary for all system/security/audit modules.
- Did not copy MyBatis/XML or Java DAO conventions. The boundary exposes
  PrismaClient/Nest provider helpers and transaction/seed primitives.

## Database TS/NestJS Best-Practice Choice

- `PrismaService` is created through a factory provider so Nest does not reflect
  constructor config as an injectable dependency.
- The package does not import `apps/api` runtime config. API startup still loads
  env first; the database package can also accept explicit options via
  `forRoot`/`forRootAsync`.
- Direct package usage preserves the previous local integration-test behavior by
  loading `.env.opencore.local` into `process.env` without printing secrets.
- Existing `apps/api/src/platform/database` remains only as a temporary
  compatibility shim; new code should import `@opencore/database` directly.

## Next Module After Database

Next lowest incomplete module after database: `packages/redis`.

---

## Redis Round Module

Module: `packages/redis`

Dependency level: fourth-lowest, after `packages/common`, `packages/core` and
`packages/database`.

Why this module: Redis key/TTL/cache/client conventions are required by file,
online-user, scheduler and monitor packages. Centralizing them now prevents
ad-hoc Redis/BullMQ connection setup from spreading across higher modules.

## Redis Implemented

- Added `@opencore/redis` as an Nx workspace library with package metadata,
  TypeScript configs, Jest config and README.
- Added silent `.env.opencore.local` loading for direct package usage without
  printing secrets.
- Added Redis runtime options:
  `RedisOptionsConfig`, `REDIS_OPTIONS`, `DEFAULT_REDIS_URL`,
  `DEFAULT_REDIS_KEY_PREFIX`, `DEFAULT_BULLMQ_QUEUE_PREFIX` and
  `readRedisOptionsFromEnv`.
- Added Redis key naming helpers:
  `normalizeRedisPrefix`, `normalizeRedisKeyPart`, `createRedisKey`,
  `createRedisKeyFactory` and `assertRedisKeyPrefixAllowed`.
- Added TTL policy helpers:
  `REDIS_TTL_SECONDS` and `normalizeTtlSeconds`.
- Added Redis client helpers:
  `createRedisClient`, `createRedisClientAdapter`,
  `createRedisConnectionOptions` and `createBullMqRedisConnectionOptions`.
- Added `RedisService` with ping, key, JSON get/set/delete and BullMQ connection
  option helper methods.
- Added `RedisModule` with default env-backed provider setup plus
  `forRoot`/`forRootAsync` dynamic module entrypoints.
- Added `@opencore/redis` to `tsconfig.base.json` path aliases and refreshed
  `pnpm-lock.yaml` importer metadata.
- Updated `apps/api/src/modules/monitor/monitoring/runtime-diagnostics.service.ts`
  to use `@opencore/redis` for Redis client and BullMQ connection construction.

## Redis Focused Verification

- Passed: `NX_DAEMON=false pnpm nx test redis`
- Passed: `NX_DAEMON=false pnpm nx typecheck redis`
- Passed: `NX_DAEMON=false pnpm nx lint redis`
- Passed: `NX_DAEMON=false pnpm nx typecheck api`
- Passed:
  `NX_DAEMON=false pnpm nx test api --runInBand --runTestsByPath src/modules/monitor/monitoring/runtime-diagnostics.service.spec.ts src/modules/monitor/monitoring/monitoring.repository.spec.ts`

## Redis Full Round Verification

- Passed: `pnpm typecheck`
- Passed: `pnpm lint`
- Passed: `pnpm test`
- Passed: `pnpm build:api`
- Passed: `pnpm prisma:validate`
- Passed: `pnpm openapi:check`
- Passed: `pnpm format:check`

Notes:

- `pnpm lint` still reports the same existing Admin Biome style hints in
  `apps/admin/scripts/smoke-test.mjs` and
  `apps/admin/src/pages/shared/CurrentPageExportButton.tsx`; command exit code
  remains 0 and these files were not changed by the backend redis migration.
- `pnpm build:api` ran `redis:build` in the dependency chain, proving the API
  build recognizes the new redis package.
- The first Redis full `pnpm format:check` attempt failed only on
  `pnpm-lock.yaml` formatting after the lockfile refresh. Running Prettier on
  the lockfile fixed it, and the final `pnpm format:check` passed.

## Redis RuoYi/Yudao Reference Points

- Preserved the platform convention of centralized cache key naming, TTL policy,
  cache monitoring and safe prefix operations.
- Did not copy Java RedisCache/CacheConstants style classes. The implementation
  uses a typed Nest module/service and small framework-light helpers around
  ioredis and BullMQ connection options.

## Redis TS/NestJS Best-Practice Choice

- Redis service depends on a stable `RedisClientLike` adapter so tests can use a
  deterministic in-memory fake while production uses ioredis.
- BullMQ receives connection options from the Redis package, but scheduler/job
  runtime remains for the later scheduler module.
- Monitor diagnostics only consumes low-level Redis/BullMQ connection helpers;
  full monitor package extraction remains a later dependency stage.

## Next Module After Redis

Next lowest incomplete module: `packages/file`.

---

## File Round Module

Module: `packages/file`

Dependency level: fifth-lowest, after `packages/common`, `packages/core`,
`packages/database` and `packages/redis`.

Why this module: system file metadata, export jobs, audit evidence, monitor
diagnostics and later scheduler/monitor packages need a reusable storage
boundary before higher system/security modules move out of `apps/api`.

## File Implemented

- Added `@opencore/file` as an Nx workspace library with package metadata,
  TypeScript configs, Jest config and README.
- Added silent `.env.opencore.local` loading for direct package usage without
  printing secrets.
- Added file storage runtime options:
  `FileStorageOptions`, `FILE_STORAGE_OPTIONS`,
  `readFileStorageOptionsFromEnv`, local root options and MinIO/S3 options.
- Added deterministic object key and safety helpers:
  `createFileAssetStorageKey`, `assertSafeFileAssetInput`,
  `sanitizeFileName`, `normalizeObjectPrefix` and `assertStorageKeyAllowed`.
- Added storage port contracts:
  `FileStorage`, `PutFileObjectInput`, `StoredFileObject`,
  `FileObjectSummary` and `DeleteFileObjectResult`.
- Added `LocalFileStorage` for local development/test storage with root-escape
  protection.
- Added `MinioFileStorage`, `createMinioStorageClient` and
  `assertS3PrefixReadable` for MinIO/S3-ready storage and monitor probes.
- Added `FileStorageService` and `FileModule` with default env-backed provider
  setup plus `forRoot`/`forRootAsync` dynamic module entrypoints.
- Added `@opencore/file` to `tsconfig.base.json` path aliases and refreshed
  `pnpm-lock.yaml` importer metadata.
- Updated system file metadata helpers in
  `apps/api/src/modules/core/system-management/system-management.repository.ts`
  to use `@opencore/file` for file validation and object key creation.
- Updated `apps/api/src/modules/monitor/monitoring/runtime-diagnostics.service.ts`
  to use `@opencore/file` for S3 prefix probing instead of directly creating a
  MinIO client.

## File Focused Verification

- Passed: `NX_DAEMON=false pnpm nx test file`
- Passed: `NX_DAEMON=false pnpm nx typecheck file`
- Passed: `NX_DAEMON=false pnpm nx lint file`
- Passed: `NX_DAEMON=false pnpm nx typecheck api`
- Passed:
  `NX_DAEMON=false pnpm nx test api --runInBand --runTestsByPath src/modules/core/system-management/system-management.repository.spec.ts src/modules/core/system-management/prisma-system-management.repository.spec.ts src/modules/monitor/monitoring/runtime-diagnostics.service.spec.ts src/modules/monitor/monitoring/monitoring.repository.spec.ts`

## File Full Round Verification

- Passed: `pnpm typecheck`
- Passed: `pnpm lint`
- Passed: `pnpm test`
- Passed: `pnpm build:api`
- Passed: `pnpm prisma:validate`
- Passed: `pnpm openapi:check`
- Passed: `pnpm format:check`

Notes:

- `pnpm lint` still reports the same existing Admin Biome style hints in
  `apps/admin/scripts/smoke-test.mjs` and
  `apps/admin/src/pages/shared/CurrentPageExportButton.tsx`; command exit code
  remains 0 and these files were not changed by the backend file migration.
- `pnpm typecheck`, `pnpm test` and `pnpm build:api` now run 12 Nx projects;
  the API typecheck/build dependency chains include `file:typecheck` and
  `file:build`.

## File RuoYi/Yudao Reference Points

- Preserved the platform convention of a centralized file center and file upload
  storage boundary for later system/export/audit workflows.
- Did not copy Java OSS utility classes or controller upload flow. The package
  exposes TypeScript storage ports plus local/MinIO adapters that Nest modules
  can inject.

## File TS/NestJS Best-Practice Choice

- Storage writes and object probes are behind a small `FileStorage` interface,
  so tests can use local/memory storage and production can use MinIO without API
  modules constructing provider clients directly.
- File metadata CRUD remains behavior-compatible in the existing system module
  for this dependency-layer migration; a later `packages/system` extraction will
  move those DTO/repository/controller concerns in the documented order.
- Monitor diagnostics only consumes a read-only S3 prefix probe from the file
  package; full monitor package extraction remains a later dependency stage.

## Next Module After File

Next lowest incomplete module: `packages/system-dict`.

---

## System Dict Round Module

Module: `packages/system` / internal boundary `system-dict`

Dependency level: sixth-lowest, after `packages/common`, `packages/core`,
`packages/database`, `packages/redis` and `packages/file`.

Why this module: dictionaries are the first system-domain runtime dependency.
They provide shared status/value vocabularies for later config, notice, dept,
post, menu, role and user modules, so they must move before the rest of the
system package.

## System Dict Implemented

- Added `@opencore/system` as an Nx workspace library with package metadata,
  TypeScript configs, Jest config and README.
- Added the `system-dict` sub-boundary with DTOs, seed records, repository
  contract, seed repository, Prisma repository, service, module and export
  preview helper.
- Moved dictionary seed records out of app-owned implementation and into
  `packages/system`.
- Added `@opencore/system` to `tsconfig.base.json` path aliases and refreshed
  `pnpm-lock.yaml` importer metadata.
- Updated `apps/api/src/modules/core/system-management/system-management.dto.ts`
  to re-export dictionary DTO classes from `@opencore/system`.
- Updated `SystemManagementController` dictionary routes to call
  `SystemDictService` from `@opencore/system`.
- Updated `SystemManagementModule` to import `SystemDictModule`.
- Removed dictionary CRUD/export ownership from legacy
  `SystemManagementRepository`, `SeedSystemManagementRepository` and
  `PrismaSystemManagementRepository`.
- Updated `prisma/seed.ts` to import `seedDictTypes` from `@opencore/system`.

## System Dict Focused Verification

- Passed: `NX_DAEMON=false pnpm nx test system`
- Passed: `NX_DAEMON=false pnpm nx typecheck system`
- Passed: `NX_DAEMON=false pnpm nx lint system`
- Passed: `NX_DAEMON=false pnpm nx typecheck api`
- Passed:
  `NX_DAEMON=false pnpm nx test api --runInBand --runTestsByPath src/modules/core/system-management/system-management.repository.spec.ts src/modules/core/system-management/prisma-system-management.repository.spec.ts src/modules/core/system-management/system-management.permission-matrix.spec.ts`
- Passed: `pnpm prisma:validate`

## System Dict Full Round Verification

- Passed: `pnpm typecheck`
- Passed: `pnpm lint`
- Passed: `pnpm test`
- Passed: `pnpm build:api`
- Passed: `pnpm prisma:validate`
- Passed: `pnpm openapi:check`
- Passed: `pnpm format:check`

Notes:

- `pnpm lint` still reports the same existing Admin Biome style hints in
  `apps/admin/scripts/smoke-test.mjs` and
  `apps/admin/src/pages/shared/CurrentPageExportButton.tsx`; command exit code
  remains 0 and these files were not changed by the backend system-dict
  migration.
- `pnpm typecheck`, `pnpm lint` and `pnpm test` now run 13 Nx projects; the API
  typecheck/build dependency chains include `system:typecheck` and
  `system:build`.

## System Dict RuoYi/Yudao Reference Points

- Preserved the familiar system-dict loop: dictionary type/value records,
  seeded platform dictionaries, CRUD, pagination and current-page export.
- Did not copy Java enum/cache utility classes or MyBatis mapper structure. The
  implementation uses Nest injectable service/repository boundaries and Prisma.

## System Dict TS/NestJS Best-Practice Choice

- `packages/system` is introduced as the long-lived system-domain package, but
  only `system-dict` is admitted in this round to preserve dependency order.
- Dictionary routes stay behavior-compatible under existing `/api/core/dicts`
  paths while the reusable runtime leaves `apps/api`.
- The old app-level system-management repository no longer owns dictionary
  CRUD; later system rounds will continue moving config, notice, dept, post,
  menu, role and user in order.

## Next Module After System Dict

Next lowest incomplete module: `packages/system-config`.

---

## System Config Round Module

Module: `packages/system` / internal boundary `system-config`

Dependency level: seventh-lowest, after `system-dict`.

Why this module: system config is the next reusable system-domain runtime. It
must preserve secret redaction before notice, dept, post, menu, role and user
runtime can move into the system package.

## System Config Implemented

- Added the `system-config` sub-boundary under `@opencore/system` with DTOs,
  seed records, repository contract, seed repository, Prisma repository,
  service, module, export preview helper and secret-safe config helpers.
- Moved system config seed records out of app-owned implementation and into
  `packages/system`.
- Preserved secret safety behavior:
  - secret-like keys require explicit `secret` visibility;
  - secret config values are returned as `[REDACTED]`;
  - list/export paths do not expose raw secret values.
- Updated `apps/api/src/modules/core/system-management/system-management.dto.ts`
  to re-export system config DTO classes from `@opencore/system`.
- Updated `SystemManagementController` config routes to call
  `SystemConfigService` from `@opencore/system`.
- Updated `SystemManagementModule` to import `SystemConfigModule`.
- Removed config CRUD/export ownership from legacy `SystemManagementRepository`,
  `SeedSystemManagementRepository` and `PrismaSystemManagementRepository`.
- Updated `prisma/seed.ts` to import `seedSystemConfigs` from
  `@opencore/system`.

## System Config Focused Verification

- Passed: `NX_DAEMON=false pnpm nx test system`
- Passed: `NX_DAEMON=false pnpm nx typecheck system`
- Passed: `NX_DAEMON=false pnpm nx lint system`
- Passed: `NX_DAEMON=false pnpm nx typecheck api`
- Passed:
  `NX_DAEMON=false pnpm nx test api --runInBand --runTestsByPath src/modules/core/system-management/system-management.repository.spec.ts src/modules/core/system-management/prisma-system-management.repository.spec.ts src/modules/core/system-management/system-management.permission-matrix.spec.ts`
- Passed: `pnpm prisma:validate`

## System Config Full Round Verification

- Passed: `pnpm typecheck`
- Passed: `pnpm lint`
- Passed: `pnpm test`
- Passed: `pnpm build:api`
- Passed: `pnpm prisma:validate`
- Passed: `pnpm openapi:check`
- Passed: `pnpm format:check`

Notes:

- `pnpm lint` still reports the same existing Admin Biome style hints in
  `apps/admin/scripts/smoke-test.mjs` and
  `apps/admin/src/pages/shared/CurrentPageExportButton.tsx`; command exit code
  remains 0 and these files were not changed by the backend system-config
  migration.
- `pnpm typecheck`, `pnpm lint` and `pnpm test` now run 13 Nx projects; the API
  build dependency chain includes `system:build`.

## System Config RuoYi/Yudao Reference Points

- Preserved the familiar system parameter/config loop: seeded config entries,
  CRUD, pagination, export and redaction for sensitive values.
- Did not copy Java config-cache utilities or Mapper XML. The implementation
  uses Nest injectable services, Prisma repositories and explicit redaction
  helpers.

## System Config TS/NestJS Best-Practice Choice

- Config runtime now lives beside dictionaries in the system-domain package,
  while `apps/api` only keeps the HTTP route surface.
- Secret handling is explicit and test-covered at the package boundary instead
  of being an app-local helper.
- Config routes remain behavior-compatible under existing `/api/core/config`
  paths until API aggregation is handled at the final stage.

## Next Module After System Config

Next lowest incomplete module: `packages/system-notice`.

---

## System Notice Round Module

Module: `packages/system` / internal boundary `system-notice`

Dependency level: eighth-lowest, after `system-config`.

Why this module: system announcements are the next RuoYi/Yudao system-domain
capability after dictionaries and parameters. They need their own lifecycle and
storage boundary before dept, post, menu, role and user runtime move into the
system package.

## System Notice Implemented

- Added the `system-notice` sub-boundary under `@opencore/system` with DTOs,
  seed records, repository contract, seed repository, Prisma repository,
  service, module, export preview helper and lifecycle guards.
- Added a dedicated `SystemNotice` Prisma model and
  `20260611193000_system_notice` migration for system announcements.
- Kept system notices separate from `CollaborationNotice`; collaboration
  notices remain in the collaboration module.
- Added seeded system notices and updated `prisma/seed.ts` to write them.
- Added a records-only `@opencore/system/records` entrypoint so Prisma seed can
  import pure data without loading Swagger-decorated DTO classes.
- Added API routes under existing system management aggregation:
  `/api/core/notices`, `/api/core/notices/export`, publish/archive lifecycle
  routes and delete/update routes.
- Added `core.notice` permissions and the `Core System Notices` OpenAPI tag to
  the module registry. Admin route/access drift remains clean because no Admin
  route was declared for this backend-only round.
- Updated the OpenAPI snapshot with system notice schemas and endpoints.

## System Notice Focused Verification

- Passed: `pnpm prisma:generate`
- Passed: `pnpm prisma:migrate`
- Passed: `pnpm prisma:seed`
- Passed: `NX_DAEMON=false pnpm nx test system`
- Passed: `NX_DAEMON=false pnpm nx typecheck system`
- Passed: `NX_DAEMON=false pnpm nx lint system`
- Passed: `NX_DAEMON=false pnpm nx test module-registry`
- Passed: `NX_DAEMON=false pnpm nx typecheck module-registry`
- Passed: `NX_DAEMON=false pnpm nx lint module-registry`
- Passed: `NX_DAEMON=false pnpm nx typecheck api`
- Passed:
  `NX_DAEMON=false pnpm nx test api --runInBand --runTestsByPath src/modules/core/system-management/system-management.permission-matrix.spec.ts src/modules/core/system-management/system-management.repository.spec.ts src/modules/core/system-management/prisma-system-management.repository.spec.ts`
- Passed: `pnpm openapi:export`
- Passed: `pnpm openapi:check`
- Passed: `pnpm openapi:registry-tags:check`
- Passed: `pnpm registry:admin-routes:check`

## System Notice Full Round Verification

- Passed: `pnpm typecheck`
- Passed: `pnpm lint`
- Passed: `pnpm test`
- Passed: `pnpm build:api`
- Passed: `pnpm prisma:validate`
- Passed: `pnpm openapi:check`
- Passed: `pnpm format:check`

Notes:

- `pnpm lint` still reports the same existing Admin Biome style hints in
  `apps/admin/scripts/smoke-test.mjs` and
  `apps/admin/src/pages/shared/CurrentPageExportButton.tsx`; command exit code
  remains 0 and these files were not changed by the backend system-notice
  migration.
- `pnpm test` still reports the existing Jest worker teardown warning after API
  tests, but exits successfully.
- `pnpm typecheck`, `pnpm lint` and `pnpm test` still run 13 Nx projects; the
  API build dependency chain includes `system:build`.

## System Notice RuoYi/Yudao Reference Points

- Preserved the familiar system notice loop: seeded notices, CRUD, pagination,
  export, publish and archive lifecycle.
- Did not reuse collaboration notice storage or copy Java notice mapper/service
  conventions. The implementation uses a dedicated Prisma model, Nest
  injectable service and explicit lifecycle guards.

## System Notice TS/NestJS Best-Practice Choice

- System notice runtime lives inside the system-domain package beside dict and
  config, while `apps/api` keeps only HTTP route aggregation.
- Prisma seed uses a records-only package entrypoint so operational seed code
  does not compile Swagger DTO decorators.
- Admin route contracts are not declared until an actual Admin page is admitted,
  keeping route/access drift checks meaningful.

## Next Module After System Notice

Next lowest incomplete module: `packages/system-dept`.

---

## System Dept Round Module

Module: `packages/system` / internal boundary `system-dept`

Dependency level: ninth-lowest, after `system-notice`.

Why this module: departments are the next system-domain structure before posts,
menus, roles and users. This round adds the tree boundary without binding users
or data-scope policies, which belong to later dependency layers.

## System Dept Implemented

- Added the `system-dept` sub-boundary under `@opencore/system` with DTOs, seed
  records, repository contract, seed repository, Prisma repository, service,
  module, tree builder, export preview helper and cycle guards.
- Added a dedicated `SystemDept` Prisma model and
  `20260611195500_system_dept` migration for department trees.
- Kept user-department binding out of scope for this round; `User` remains
  unchanged until the system-user/data-scope rounds.
- Added seeded departments under `@opencore/system/records` and updated
  `prisma/seed.ts` to write them.
- Added API routes under existing system management aggregation:
  `/api/core/depts`, `/api/core/depts/export`, create/update/delete routes.
- Added `core.dept` permissions and the `Core Departments` OpenAPI tag to the
  module registry. Admin route/access drift remains clean because no Admin
  route was declared for this backend-only round.
- Updated the OpenAPI snapshot with system dept schemas and endpoints.

## System Dept Focused Verification

- Passed: `pnpm prisma:generate`
- Passed: `pnpm prisma:migrate`
- Passed: `pnpm prisma:seed`
- Passed: `NX_DAEMON=false pnpm nx test system`
- Passed: `NX_DAEMON=false pnpm nx typecheck system`
- Passed: `NX_DAEMON=false pnpm nx lint system`
- Passed: `NX_DAEMON=false pnpm nx test module-registry`
- Passed: `NX_DAEMON=false pnpm nx typecheck api`
- Passed:
  `NX_DAEMON=false pnpm nx test api --runInBand --runTestsByPath src/modules/core/system-management/system-management.permission-matrix.spec.ts src/modules/core/system-management/system-management.repository.spec.ts src/modules/core/system-management/prisma-system-management.repository.spec.ts`
- Passed: `NX_DAEMON=false pnpm nx lint module-registry`
- Passed: `pnpm openapi:export`
- Passed: `pnpm openapi:check`
- Passed: `pnpm openapi:registry-tags:check`
- Passed: `pnpm registry:admin-routes:check`
- Passed: `pnpm format:check`

## System Dept Full Round Verification

- Passed: `pnpm typecheck`
- Passed: `pnpm lint`
- Passed: `pnpm test`
- Passed: `pnpm build:api`
- Passed: `pnpm prisma:validate`
- Passed: `pnpm openapi:check`
- Passed: `pnpm format:check`

Notes:

- The first parallel full-gate attempt made Admin `max setup`/`tsc` race and
  temporarily reported missing `@umijs/max` generated exports. Sequential
  reruns of `pnpm typecheck` and `pnpm lint` passed; Nx marked the Admin tasks
  flaky.
- `pnpm lint` still reports the same existing Admin Biome style hints in
  `apps/admin/scripts/smoke-test.mjs` and
  `apps/admin/src/pages/shared/CurrentPageExportButton.tsx`; command exit code
  remains 0 and these files were not changed by the backend system-dept
  migration.
- `pnpm test` still reports an existing Jest worker teardown warning in some
  runs, but exits successfully.
- `pnpm typecheck`, `pnpm lint` and `pnpm test` still run 13 Nx projects; the
  API build dependency chain includes `system:build`.

## System Dept RuoYi/Yudao Reference Points

- Preserved the familiar department management loop: seeded root/child
  departments, tree read, CRUD, export and guarded deletion when children
  exist.
- Did not add Java-style `ancestors`, soft delete flags or user binding in this
  round. The implementation uses explicit tree construction and cycle checks in
  TypeScript.

## System Dept TS/NestJS Best-Practice Choice

- Department runtime lives inside the system-domain package beside dict,
  config and notice, while `apps/api` keeps only HTTP route aggregation.
- The Prisma self-relation uses `onDelete: SetNull`, while the service layer
  rejects parent deletion if children exist to preserve RuoYi/Yudao operator
  expectations.
- User binding and data-scope enforcement are deferred to their documented
  lower/higher dependency rounds instead of being hidden inside department
  CRUD.

## Next Module After System Dept

Next lowest incomplete module: `packages/system-post`.

---

## System Post Round Module

Module: `packages/system` / internal boundary `system-post`

Dependency level: tenth-lowest, after `system-dept`.

Why this module: posts/positions are the next RuoYi/Yudao system-domain
dictionary after departments. The package boundary must exist before users can
be linked to posts in the later system-user round.

## System Post Implemented

- Added the `system-post` sub-boundary under `@opencore/system` with DTOs, seed
  records, repository contract, seed repository, Prisma repository, service,
  module, pagination helpers and export preview helper.
- Added a dedicated `SystemPost` Prisma model and
  `20260611202000_system_post` migration for post/position management.
- Kept user-post binding out of scope for this round; `User` remains unchanged
  until the system-user round.
- Added seeded posts under `@opencore/system/records` and updated
  `prisma/seed.ts` to write them.
- Added API routes under existing system management aggregation:
  `/api/core/posts`, `/api/core/posts/export`, create/update/delete routes.
- Added `core.post` permissions and the `Core Posts` OpenAPI tag to the module
  registry. Admin route/access drift remains clean because no Admin route was
  declared for this backend-only round.
- Updated the OpenAPI snapshot with system post schemas and endpoints.

## System Post Focused Verification

- Passed: `pnpm prisma:generate`
- Passed: `pnpm prisma:migrate`
- Passed: `pnpm prisma:seed`
- Passed: `NX_DAEMON=false pnpm nx test system`
- Passed: `NX_DAEMON=false pnpm nx typecheck system`
- Passed: `NX_DAEMON=false pnpm nx lint system`
- Passed: `NX_DAEMON=false pnpm nx test module-registry`
- Passed: `NX_DAEMON=false pnpm nx typecheck api`
- Passed:
  `NX_DAEMON=false pnpm nx test api --runInBand --runTestsByPath src/modules/core/system-management/system-management.permission-matrix.spec.ts src/modules/core/system-management/system-management.repository.spec.ts src/modules/core/system-management/prisma-system-management.repository.spec.ts`
- Passed: `NX_DAEMON=false pnpm nx lint module-registry`
- Passed: `pnpm openapi:export`
- Passed: `pnpm openapi:check`
- Passed: `pnpm openapi:registry-tags:check`
- Passed: `pnpm registry:admin-routes:check`
- Passed: `pnpm format:check`

## System Post Full Round Verification

- Passed: `pnpm typecheck`
- Passed: `pnpm lint`
- Passed: `pnpm test`
- Passed: `pnpm build:api`
- Passed: `pnpm prisma:validate`
- Passed: `pnpm openapi:check`
- Passed: `pnpm format:check`

Notes:

- `pnpm lint` still reports the same existing Admin Biome style hints in
  `apps/admin/scripts/smoke-test.mjs` and
  `apps/admin/src/pages/shared/CurrentPageExportButton.tsx`; command exit code
  remains 0 and these files were not changed by the backend system-post
  migration.
- `pnpm typecheck`, `pnpm lint` and `pnpm test` still run 13 Nx projects; the
  API build dependency chain includes `system:build`.

## System Post RuoYi/Yudao Reference Points

- Preserved the familiar post/position management loop: seeded posts, CRUD,
  pagination, enabled filtering, export and basic input guards.
- Did not add user-post joins or Java-style deletion flags in this round. User
  binding remains reserved for the documented system-user dependency layer.

## System Post TS/NestJS Best-Practice Choice

- Post runtime lives inside the system-domain package beside dict, config,
  notice and dept, while `apps/api` keeps only HTTP route aggregation.
- Code/order validation sits at the package repository boundary and is covered
  by seed and Prisma repository tests.
- Post list behavior uses common pagination helpers instead of ad-hoc page
  math.

## Next Module After System Post

Next lowest incomplete module: `packages/system-menu`.

---

## System Menu Round Module

Module: `packages/system` / internal boundary `system-menu`

Dependency level: eleventh-lowest, after `system-post`.

Why this module: menu runtime is the next system-domain boundary before roles
and users. Moving it out of RBAC keeps user/role/permission extraction smaller
while preserving the existing `/api/core/menus` contract.

## System Menu Implemented

- Added the `system-menu` sub-boundary under `@opencore/system` with DTOs,
  registry-backed seed records, repository contract, seed repository, Prisma
  repository, service, module and export preview helper.
- Reused the existing `Menu` Prisma model instead of adding a second menu table.
  The Prisma repository still validates `permissionCode` against `Permission`
  before writing `permissionId`.
- Preserved registry-derived menu stage metadata through `@opencore/system`
  records so S6/S7/S8 menu responses keep their existing stage contract.
- Updated `RbacController` to keep the same `/api/core/menus` routes while
  delegating list/export/create/update/delete to `SystemMenuService`.
- Removed menu CRUD/export ownership from `RbacRepository`,
  `PrismaRbacRepository` and `SeedRbacRepository`; RBAC now remains focused on
  users, roles, permissions, auth and permission lookup.
- Kept RBAC permission deletion clearing `Menu.permissionId` before deleting a
  permission, preserving database integrity until permission runtime is moved
  in a later security/system round.
- Added system-menu package tests for seed CRUD/export, validation, PostgreSQL
  seeded menu reads, permission-code traceability and Prisma CRUD.
- Updated `@opencore/system` package metadata, README, root exports and
  records-only exports for menu runtime.

## System Menu Focused Verification

- Passed: `pnpm prisma:seed`
- Passed: `NX_DAEMON=false pnpm nx typecheck system`
- Passed: `NX_DAEMON=false pnpm nx test system`
- Passed: `NX_DAEMON=false pnpm nx lint system`
- Passed: `NX_DAEMON=false pnpm nx typecheck api`
- Passed:
  `NX_DAEMON=false pnpm nx test api --runInBand --runTestsByPath src/modules/core/rbac/rbac.repository.spec.ts src/modules/core/rbac/prisma-rbac.repository.spec.ts src/modules/core/rbac/rbac.permission-matrix.spec.ts`
- Passed: `NX_DAEMON=false pnpm nx lint api`
- Passed: `NX_DAEMON=false pnpm nx lint module-registry`
- Passed: `pnpm prisma:validate`
- Passed: `pnpm openapi:export`
- Passed: `pnpm openapi:check`
- Passed: `pnpm openapi:registry-tags:check`
- Passed: `pnpm registry:admin-routes:check`
- Passed: `pnpm format:check`

## System Menu Full Round Verification

- Passed: `pnpm typecheck`
- Passed: `pnpm lint`
- Passed: `pnpm test`
- Passed: `pnpm build:api`
- Passed: `pnpm prisma:validate`
- Passed: `pnpm openapi:check`
- Passed: `pnpm format:check`

Notes:

- `pnpm prisma:seed` passed with 104 permissions, 35 menus, 2 roles and the
  current system-management baseline.
- `NX_DAEMON=false pnpm nx test system` now covers 6 suites / 24 tests across
  dict, config, notice, dept, post and menu.
- `pnpm lint` still reports the same existing Admin Biome style hints in
  `apps/admin/scripts/smoke-test.mjs` and
  `apps/admin/src/pages/shared/CurrentPageExportButton.tsx`; command exit code
  remains 0 and these files were not changed by the backend system-menu
  migration.
- `pnpm typecheck`, `pnpm lint` and `pnpm test` still run 13 Nx projects; the
  API build dependency chain includes `system:build`.

## System Menu RuoYi/Yudao Reference Points

- Preserved the familiar menu management loop: registry-seeded menus, CRUD,
  permission-code binding and export preview.
- Did not introduce a Java-style route tree/table split or hidden framework
  coupling in this round. The current contract remains the existing flat
  OpenCore menu model until Admin route/menu hierarchy needs a broader change.

## System Menu TS/NestJS Best-Practice Choice

- Menu runtime now lives inside the system-domain package while `apps/api`
  keeps only HTTP route aggregation and permission decorators.
- The package validates menu key, path, order and permission-code linkage at
  the repository boundary and covers both seed and Prisma repositories.
- The existing RBAC permission repository only retains the referential-integrity
  cleanup needed when deleting permissions; menu CRUD/export no longer belongs
  to RBAC.

## Next Module After System Menu

Next lowest incomplete module: `packages/system-role`.

---

## System Role Round Module

Module: `packages/system` / internal boundary `system-role`

Dependency level: twelfth-lowest, after `system-menu`.

Why this module: role runtime is the next system-domain boundary after menus.
Moving it out of RBAC narrows the remaining RBAC surface to users, permissions,
auth and permission lookup before the documented system-user and security
rounds.

## System Role Implemented

- Added the `system-role` sub-boundary under `@opencore/system` with DTOs,
  registry-backed seed records, repository contract, seed repository, Prisma
  repository, service, module and export preview helper.
- Reused the existing `Role`, `RolePermission` and `UserRole` Prisma models
  instead of adding new role tables.
- Moved seeded `admin` and `viewer` role definitions into
  `@opencore/system/records`; `prisma/seed.ts` now uses those records while
  still seeding permissions and menus from the registry.
- Updated `RbacController` to keep the same `/api/core/roles` routes while
  delegating list/export/create/update/delete to `SystemRoleService`.
- Removed role CRUD/export ownership from `RbacRepository`,
  `PrismaRbacRepository` and `SeedRbacRepository`; RBAC now keeps only the role
  access needed for user role assignment validation and auth permission lookup.
- Preserved referential cleanup on role delete in the system role Prisma
  repository by removing `RolePermission` and `UserRole` rows before deleting a
  custom role.
- Added system-role package tests for seed CRUD/export, invalid input,
  duplicate permission codes, system-role deletion/demotion guards, PostgreSQL
  seeded role reads, permission-code traceability, Prisma CRUD and user-role
  unlink behavior.
- Updated `@opencore/system` README, root exports and records-only exports for
  role runtime.

## System Role Focused Verification

- Passed: `NX_DAEMON=false pnpm nx typecheck system`
- Passed: `NX_DAEMON=false pnpm nx test system`
- Passed: `NX_DAEMON=false pnpm nx lint system`
- Passed: `NX_DAEMON=false pnpm nx typecheck api`
- Passed:
  `NX_DAEMON=false pnpm nx test api --runInBand --runTestsByPath src/modules/core/rbac/rbac.repository.spec.ts src/modules/core/rbac/prisma-rbac.repository.spec.ts src/modules/core/rbac/rbac.permission-matrix.spec.ts src/modules/core/rbac/auth.service.spec.ts src/modules/core/rbac/permission.guard.spec.ts`
- Passed: `pnpm prisma:seed`
- Passed: `NX_DAEMON=false pnpm nx lint api`
- Passed: `pnpm prisma:validate`
- Passed: `pnpm openapi:export`
- Passed: `pnpm openapi:check`
- Passed: `pnpm openapi:registry-tags:check`
- Passed: `pnpm registry:admin-routes:check`
- Passed: `pnpm format:check`

## System Role Full Round Verification

- Passed: `pnpm typecheck`
- Passed: `pnpm lint`
- Passed: `pnpm test`
- Passed: `pnpm build:api`
- Passed: `pnpm prisma:validate`
- Passed: `pnpm openapi:check`
- Passed: `pnpm format:check`

Notes:

- `pnpm prisma:seed` passed with 104 permissions, 35 menus, 2 roles and the
  current system-management baseline.
- `NX_DAEMON=false pnpm nx test system` now covers 7 suites / 30 tests across
  dict, config, notice, dept, post, menu and role.
- `pnpm lint` still reports the same existing Admin Biome style hints in
  `apps/admin/scripts/smoke-test.mjs` and
  `apps/admin/src/pages/shared/CurrentPageExportButton.tsx`; command exit code
  remains 0 and these files were not changed by the backend system-role
  migration.
- `pnpm test` still reports an existing Jest worker teardown warning in some
  runs, but exits successfully.
- `pnpm typecheck`, `pnpm lint` and `pnpm test` still run 13 Nx projects; the
  API build dependency chain includes `system:build`.

## System Role RuoYi/Yudao Reference Points

- Preserved the familiar role management loop: seeded admin/viewer roles, CRUD,
  permission-code assignment, export preview and system-role deletion guard.
- Did not copy Java role-menu tables or Spring Security conventions in this
  round. Permission assignment remains Prisma-backed through existing
  `RolePermission`, and route guards stay in NestJS decorators/guards until the
  security rounds.

## System Role TS/NestJS Best-Practice Choice

- Role runtime now lives inside the system-domain package while `apps/api`
  keeps HTTP route aggregation and permission decorators.
- The package validates role code, duplicate permission codes and permission
  existence at the repository boundary and tests both seed and Prisma
  repositories.
- RBAC repositories deliberately retain only internal role reads needed by user
  assignment/auth. That keeps this round behavior-preserving while preparing
  the next `system-user` extraction.

## Next Module After System Role

Next lowest incomplete module: `packages/system-user`.

---

## System User Round Module

Module: `packages/system` / internal boundary `system-user`

Dependency level: thirteenth-lowest, after `system-role`.

Why this module: user runtime is the last system-domain boundary before auth
and RBAC guard extraction. Moving it out of RBAC narrows the remaining RBAC
surface to authentication/session validation, permission CRUD and permission
lookup ahead of the security rounds.

## System User Implemented

- Added the `system-user` sub-boundary under `@opencore/system` with DTOs,
  seed records, repository contract, seed repository, Prisma repository,
  service, module, password hash helper and export preview helper.
- Reused the existing `User` and `UserRole` Prisma models instead of adding a
  second user table.
- Moved seeded admin user data into `@opencore/system/records`;
  `prisma/seed.ts` now seeds users from those records while still overriding
  the admin password through `BOOTSTRAP_ADMIN_PASSWORD`.
- Updated `RbacController` to keep the same `/api/core/users` routes while
  delegating list/export/create/update/delete to `SystemUserService`.
- Removed user CRUD/export ownership from `RbacRepository`,
  `PrismaRbacRepository` and `SeedRbacRepository`; RBAC now keeps only user
  reads needed for login/session validation and permission lookup.
- Kept the legacy RBAC `hashPassword` entrypoint as a compatibility re-export
  to the system-user password hash helper until `security-auth` owns password
  hashing.
- Added system-user package tests for seed CRUD/export, invalid input,
  duplicate role-code rejection, missing-role rejection, PostgreSQL seeded user
  reads, Prisma CRUD, password hashing and user-role unlink behavior.
- Updated RBAC permission guard tests to use explicit user fixtures instead of
  calling user CRUD on the RBAC seed repository.
- Updated `@opencore/system` README, root exports and records-only exports for
  user runtime.

## System User Focused Verification

- Passed: `NX_DAEMON=false pnpm nx typecheck system`
- Passed: `NX_DAEMON=false pnpm nx test system`
- Passed: `NX_DAEMON=false pnpm nx typecheck api`
- Passed:
  `NX_DAEMON=false pnpm nx test api --runInBand --runTestsByPath src/modules/core/rbac/rbac.repository.spec.ts src/modules/core/rbac/prisma-rbac.repository.spec.ts src/modules/core/rbac/auth.service.spec.ts src/modules/core/rbac/permission.guard.spec.ts src/modules/core/rbac/rbac.permission-matrix.spec.ts`
- Passed: `NX_DAEMON=false pnpm nx lint system`
- Passed: `NX_DAEMON=false pnpm nx lint api`
- Passed: `pnpm prisma:seed`
- Passed: `pnpm openapi:export`
- Passed: `pnpm openapi:check`
- Passed: `pnpm openapi:registry-tags:check`
- Passed: `pnpm registry:admin-routes:check`
- Passed: `pnpm format:check`
- Passed: `pnpm prisma:validate`

## System User Full Round Verification

- Passed: `pnpm typecheck`
- Passed: `pnpm lint`
- Passed: `pnpm test`
- Passed: `pnpm build:api`
- Passed: `pnpm prisma:validate`
- Passed: `pnpm openapi:check`
- Passed: `pnpm format:check`

Notes:

- `pnpm prisma:seed` passed with 104 permissions, 35 menus, 2 roles, 1 user and
  the current system-management baseline.
- `NX_DAEMON=false pnpm nx test system` now covers 8 suites / 34 tests across
  dict, config, notice, dept, post, menu, role and user.
- `pnpm lint` still reports the same existing Admin Biome style hints in
  `apps/admin/scripts/smoke-test.mjs` and
  `apps/admin/src/pages/shared/CurrentPageExportButton.tsx`; command exit code
  remains 0 and these files were not changed by the backend system-user
  migration.
- `pnpm test` may still report the existing Jest worker teardown warning in some
  runs, but exits successfully.
- `pnpm typecheck`, `pnpm lint` and `pnpm test` still run 13 Nx projects; the
  API build dependency chain includes `system:build`.

## System User RuoYi/Yudao Reference Points

- Preserved the familiar user management loop: seeded admin user, user CRUD,
  role-code assignment, enabled/disabled state, password hashing and export
  preview.
- Did not copy Java user-post/dept binding or deletion-flag conventions in this
  round. Department/post binding remains a later design decision once the
  security/data-scope boundary exists.

## System User TS/NestJS Best-Practice Choice

- User runtime now lives inside the system-domain package while `apps/api`
  keeps HTTP route aggregation and permission decorators.
- The package validates username format, duplicate role codes and role
  existence at the repository boundary and tests both seed and Prisma
  repositories.
- Password hashing is temporarily colocated with system-user to avoid importing
  from `apps/api`; `security-auth` is the next module and should own the final
  auth/JWT/password boundary.
- RBAC repositories deliberately retain only user reads needed by auth. That
  keeps existing login/session behavior stable while preparing the next
  `security-auth` extraction.

## Next Module After System User

Next lowest incomplete module: `packages/security-auth`.

---

## Security Auth Round Module

Module: `packages/security` / internal boundary `security-auth`

Dependency level: fourteenth-lowest, after `system-user`.

Why this module: login/session, bearer token verification and password hashing
were still implemented inside the RBAC API module or temporarily colocated with
system-user. Moving them into a security package narrows the remaining RBAC API
surface to permissions and prepares the next `security-rbac` guard/decorator
extraction.

## Security Auth Implemented

- Added `@opencore/security` as an Nx workspace library with package metadata,
  TypeScript configs, Jest config and README.
- Added the `security-auth` sub-boundary with:
  - `SecurityAuthUserRepository` as the auth-facing user/permission/login-log
    port.
  - `SecurityAuthService` for login, session creation and bearer
    authentication.
  - `SecurityBearerTokenService` for HMAC bearer token signing and
    verification.
  - `hashSecurityPassword` and `verifySecurityPassword` password helpers.
  - `SecurityAuthModule.forRepository(...)` for reusable Nest module wiring.
- Updated API RBAC `AuthService` and password helper files to compatibility
  re-export the security package implementation instead of owning auth logic.
- Updated `RbacRepository` to extend `SecurityAuthUserRepository`, keeping
  permission CRUD/export in RBAC while auth user reads and login-attempt
  recording satisfy the security port.
- Updated `RbacModule` to provide `SecurityAuthUserRepository` through the
  existing `RbacRepository` and to register `SecurityBearerTokenService`.
- Updated system-user password hashing to delegate to `@opencore/security`, so
  user create/update, seed and login validation share the same helper.
- Added security-auth tests for password hashing, bearer token sign/verify,
  malformed/tampered/expired token rejection, login success/failure logging and
  disabled-user rejection.

## Security Auth Focused Verification

- Passed: `NX_DAEMON=false pnpm nx typecheck security`
- Passed: `NX_DAEMON=false pnpm nx test security`
- Passed: `NX_DAEMON=false pnpm nx lint security`
- Passed: `NX_DAEMON=false pnpm nx typecheck system`
- Passed: `NX_DAEMON=false pnpm nx test system`
- Passed: `NX_DAEMON=false pnpm nx typecheck api`
- Passed:
  `NX_DAEMON=false pnpm nx test api --runInBand --runTestsByPath src/modules/core/rbac/auth.service.spec.ts src/modules/core/rbac/permission.guard.spec.ts src/modules/core/rbac/prisma-rbac.repository.spec.ts src/modules/core/rbac/rbac.repository.spec.ts src/modules/core/rbac/rbac.permission-matrix.spec.ts`
- Passed: `NX_DAEMON=false pnpm nx lint system`
- Passed: `NX_DAEMON=false pnpm nx lint api`
- Passed: `pnpm prisma:seed`
- Passed: `pnpm openapi:export`
- Passed: `pnpm openapi:check`
- Passed: `pnpm openapi:registry-tags:check`
- Passed: `pnpm registry:admin-routes:check`

## Security Auth Full Round Verification

- Passed: `pnpm typecheck`
- Passed: `pnpm lint`
- Passed: `pnpm test`
- Passed: `pnpm build:api`
- Passed: `pnpm prisma:validate`
- Passed: `pnpm openapi:check`
- Passed: `pnpm format:check`

Notes:

- `pnpm install --lockfile-only` refreshed workspace metadata for 14 projects
  and retained existing peer dependency warnings.
- `pnpm prisma:seed` passed with 104 permissions, 35 menus, 2 roles, 1 user and
  the current system-management baseline.
- `NX_DAEMON=false pnpm nx test security` covers 1 suite / 4 tests for the new
  auth boundary.
- `NX_DAEMON=false pnpm nx test system` remains 8 suites / 34 tests after
  system-user delegates password hashing to security.
- `pnpm lint` still reports the same existing Admin Biome style hints in
  `apps/admin/scripts/smoke-test.mjs` and
  `apps/admin/src/pages/shared/CurrentPageExportButton.tsx`; command exit code
  remains 0 and these files were not changed by the backend security-auth
  migration.
- `pnpm test` may still report the existing Jest worker teardown warning in some
  runs, but exits successfully.
- `pnpm typecheck`, `pnpm lint` and `pnpm test` now run 14 Nx projects; the API
  typecheck/build dependency chain includes `security`.

## Security Auth RuoYi/Yudao Reference Points

- Preserved the familiar auth loop: password validation, token creation,
  token parsing, current-user resolution and login-attempt recording.
- Did not copy Spring Security filter chains or Java session/cache patterns.
  Token handling is a small NestJS service with an explicit repository port.

## Security Auth TS/NestJS Best-Practice Choice

- The security package owns auth primitives and exposes a port rather than
  importing RBAC or system repositories directly.
- API RBAC remains the concrete provider for user reads, permission-code
  lookup and login-attempt persistence until later rounds extract
  `security-rbac` and audit login logs.
- The legacy API auth files are compatibility re-export shims, keeping existing
  controller/guard imports stable while making the reusable implementation live
  in `@opencore/security`.

## Next Module After Security Auth

Next lowest incomplete module: `packages/security-rbac`.

---

## Security RBAC Round Module

Module: `packages/security` / internal boundary `security-rbac`

Dependency level: fifteenth-lowest, after `security-auth`.

Why this module: permission and role authorization metadata/guards were still
owned by the API RBAC module. Moving them into the security package keeps RBAC
authorization reusable and leaves the API module as route aggregation plus
concrete repository wiring.

## Security RBAC Implemented

- Added the `security-rbac` sub-boundary under `@opencore/security` with:
  - `RequirePermission` and `RequireRole` metadata decorators.
  - `SecurityPermissionGuard` and `SecurityRoleGuard`.
  - `SecurityRequestWithAuth` request contract.
- Updated API RBAC `permission.guard.ts` and `permissions.decorator.ts` to
  compatibility re-export the security package implementation.
- Updated `RbacModule` to keep the existing permission guard registration and
  add the role guard as a second global Nest guard.
- Security guards resolve the current user through `SecurityAuthService` and
  reuse `request.user` when an earlier guard has already authenticated the
  request.
- Added security-rbac tests for metadata decorators, permission allow/deny,
  missing bearer rejection, role allow/deny and request-user reuse.
- Updated security package metadata to depend on `@nestjs/core` and
  `@opencore/contracts` for Reflector and permission-code typing.

## Security RBAC Focused Verification

- Passed: `NX_DAEMON=false pnpm nx typecheck security`
- Passed: `NX_DAEMON=false pnpm nx test security`
- Passed: `NX_DAEMON=false pnpm nx lint security`
- Passed: `NX_DAEMON=false pnpm nx typecheck api`
- Passed:
  `NX_DAEMON=false pnpm nx test api --runInBand --runTestsByPath src/modules/core/rbac/permission.guard.spec.ts src/modules/core/rbac/auth.service.spec.ts src/modules/core/rbac/rbac.permission-matrix.spec.ts`
- Passed: `NX_DAEMON=false pnpm nx lint api`
- Passed: `pnpm prisma:seed`
- Passed: `pnpm openapi:export`
- Passed: `pnpm openapi:check`
- Passed: `pnpm openapi:registry-tags:check`
- Passed: `pnpm registry:admin-routes:check`

## Security RBAC Full Round Verification

- Passed: `pnpm typecheck`
- Passed: `pnpm lint`
- Passed: `pnpm test`
- Passed: `pnpm build:api`
- Passed: `pnpm prisma:validate`
- Passed: `pnpm openapi:check`
- Passed: `pnpm format:check`

Notes:

- `pnpm install --lockfile-only` refreshed workspace metadata after
  `@opencore/security` added `@nestjs/core` and `@opencore/contracts`; existing
  peer dependency warnings remain unchanged.
- `NX_DAEMON=false pnpm nx test security` now covers 2 suites / 10 tests across
  auth and RBAC security boundaries.
- `pnpm prisma:seed` passed with 104 permissions, 35 menus, 2 roles, 1 user and
  the current system-management baseline.
- `pnpm lint` still reports the same existing Admin Biome style hints in
  `apps/admin/scripts/smoke-test.mjs` and
  `apps/admin/src/pages/shared/CurrentPageExportButton.tsx`; command exit code
  remains 0 and these files were not changed by the backend security-rbac
  migration.
- `pnpm typecheck`, `pnpm lint` and `pnpm test` still run 14 Nx projects; the
  API typecheck/build dependency chain includes `security`.

## Security RBAC RuoYi/Yudao Reference Points

- Preserved the familiar authorization loop: route metadata, permission guard,
  role guard and current-user permission/role matching.
- Did not copy Spring Security annotations or interceptor chains. The
  implementation uses NestJS metadata decorators and guards with an explicit
  auth service dependency.

## Security RBAC TS/NestJS Best-Practice Choice

- Guards live in the reusable security package and depend on the auth service
  abstraction instead of importing API repositories directly.
- API RBAC files remain as temporary re-export shims for route compatibility;
  new code should import authorization decorators/guards from
  `@opencore/security`.
- Role guard is registered globally but is inert unless `RequireRole` metadata
  is present, preserving existing route behavior while admitting role metadata
  for later modules.

## Next Module After Security RBAC

Next lowest incomplete module: `packages/security-data-scope`.

---

## Security Data Scope Round Module

Module: `packages/security` / internal boundary `security-data-scope`

Dependency level: sixteenth-lowest, after `security-rbac`.

Why this module: data permission policy needs authenticated user, role and
department context. Implementing it after auth/RBAC and after system dept/user
keeps the reusable security policy separate from concrete API repositories.

## Security Data Scope Implemented

- Added the `security-data-scope` sub-boundary under `@opencore/security` with:
  - `RequireDataScope` metadata decorator and `REQUIRED_DATA_SCOPE_KEY`.
  - `SecurityDataScopeGuard` and `SecurityRequestWithDataScope`.
  - `SecurityDataScopeRepository` port and `SecurityDataScopeService`.
  - Constraint/query helpers:
    `resolveSecurityDataScopeConstraint`,
    `createSecurityDataScopeQueryFilter` and
    `mergeSecurityDataScopeQueryFilter`.
- Added role scope semantics for `all`, `custom`, `dept_tree`, `own_dept` and
  `self`; `all` wins, restricted scopes merge user/dept ids, and missing
  effective scope produces a deny filter.
- Extended Prisma schema and migration
  `20260611213000_security_data_scope` with role data-scope fields, optional
  user `deptId`, and the `User` to `SystemDept` relation/index.
- Extended system role DTOs/records/repositories/tests with `dataScope` and
  `dataScopeDeptIds`, including duplicate dept id rejection and missing dept
  validation for custom scopes.
- Extended system user DTOs/records/repositories/tests with optional `deptId`,
  including missing dept validation and null clearing on update.
- Updated Prisma seed ordering so system departments are present before users
  are seeded, then seeded role scope configuration and admin user department.
- Updated API RBAC Prisma/seed repositories to implement data-scope profile and
  department descendant lookup for the security repository port.
- Updated API RBAC module to map `SecurityDataScopeRepository` to
  `RbacRepository`, provide `SecurityDataScopeService`, and register
  `SecurityDataScopeGuard` globally. The guard remains inert without
  `RequireDataScope` metadata.
- Updated API RBAC decorator shim to re-export `RequireDataScope` and the
  metadata key.
- Refreshed OpenAPI snapshot for the new role/user DTO fields.

## Security Data Scope Focused Verification

- Passed: `pnpm prisma:generate`
- Passed: `pnpm prisma:migrate`
- Passed: `pnpm prisma:seed`
- Passed: `NX_DAEMON=false pnpm nx typecheck security`
- Passed: `NX_DAEMON=false pnpm nx typecheck system`
- Passed: `NX_DAEMON=false pnpm nx typecheck api`
- Passed: `NX_DAEMON=false pnpm nx test security`
- Passed: `NX_DAEMON=false pnpm nx test system`
- Passed: `NX_DAEMON=false pnpm nx test api`
- Passed: `NX_DAEMON=false pnpm nx lint security`
- Passed: `NX_DAEMON=false pnpm nx lint system`
- Passed: `NX_DAEMON=false pnpm nx lint api`
- Passed: `pnpm prisma:validate`
- Passed: `pnpm openapi:export`
- Passed: `pnpm openapi:check`
- Passed: `pnpm openapi:registry-tags:check`
- Passed: `pnpm registry:admin-routes:check`

## Security Data Scope Full Round Verification

- Passed: `pnpm typecheck`
- Passed: `pnpm lint`
- Passed: `pnpm test`
- Passed: `pnpm build:api`
- Passed: `pnpm prisma:validate`
- Passed: `pnpm openapi:check`
- Passed: `pnpm format:check`

Notes:

- `pnpm openapi:check` initially reported expected drift after role/user DTOs
  gained data-scope/dept fields; `pnpm openapi:export` refreshed the snapshot
  and the check then passed.
- A Prisma integration test was adjusted to resolve the seeded admin by
  username because existing local databases can retain an older generated admin
  id across seed runs.
- `pnpm prisma:seed` passed with 104 permissions, 35 menus, 2 roles, 1 user and
  the current system-management baseline.
- `NX_DAEMON=false pnpm nx test security` now covers 3 suites / 16 tests across
  auth, RBAC and data-scope security boundaries.
- `NX_DAEMON=false pnpm nx test system` now covers 8 suites / 34 tests with
  role/user data-scope and department ownership assertions included.
- `NX_DAEMON=false pnpm nx test api` now covers 28 suites / 78 tests including
  RBAC data-scope repository integration.
- `pnpm lint` still reports the same existing Admin Biome style hints in
  `apps/admin/scripts/smoke-test.mjs` and
  `apps/admin/src/pages/shared/CurrentPageExportButton.tsx`; command exit code
  remains 0 and these files were not changed by the backend data-scope
  migration.
- `pnpm typecheck`, `pnpm lint` and `pnpm test` run 14 Nx projects; the API
  typecheck/build dependency chain includes `security` and `system`.

## Security Data Scope RuoYi/Yudao Reference Points

- Preserved the familiar data-permission model: all data, custom departments,
  department tree, own department and self-only.
- Did not copy MyBatis SQL interceptors or string-based query fragments. The
  implementation returns structured constraint and query-filter objects that
  repositories can merge explicitly.

## Security Data Scope TS/NestJS Best-Practice Choice

- Data-scope policy lives in the reusable security package and depends on an
  abstract repository port instead of importing Prisma or API modules.
- The global guard is metadata-driven and inert without `RequireDataScope`,
  preserving existing route behavior while enabling admitted routes to opt in.
- Query filter helpers are plain TypeScript so Prisma repositories and future
  package repositories can apply the same policy without coupling to NestJS.

## Next Module After Security Data Scope

Next lowest incomplete module: `packages/audit-login-log`.

---

## Audit Login Log Round Module

Module: `packages/audit` / internal boundary `audit-login-log`

Dependency level: seventeenth-lowest, after `security-data-scope`.

Why this module: login logs depend on authentication context and the existing
database boundary. Extracting them after security keeps login write/query/export
behavior reusable while `apps/api` remains route aggregation and provider
wiring.

## Audit Login Log Implemented

- Added `@opencore/audit` as an Nx workspace library with package metadata,
  TypeScript configs, Jest config, README and records-only export
  `@opencore/audit/records`.
- Added the `audit-login-log` sub-boundary with:
  - `LoginLogDto`, `LoginLogPageDto` and `LoginLogQueryDto`.
  - `AuditLoginLogRecord` seed records.
  - `AuditLoginLogRepository`, `SeedAuditLoginLogRepository` and
    `PrismaAuditLoginLogRepository`.
  - `AuditLoginLogService` and `AuditLoginLogModule`.
  - Page normalization, username/success filters and current-page export
    preview helper.
- Reused the existing `LoginLog` Prisma model; no schema migration was needed
  in this round.
- Moved login log seed records to `@opencore/audit/records` and updated
  `prisma/seed.ts` to consume that records-only boundary directly.
- Introduced `SecurityLoginAttemptRecorder` and
  `NoopSecurityLoginAttemptRecorder` in `@opencore/security`, then changed
  `SecurityAuthService` to record login attempts through that dedicated port.
- Removed login-attempt persistence from API RBAC Prisma/seed repositories so
  RBAC no longer owns login log writes.
- Updated `RbacModule` to import `AuditLoginLogModule`, which exports
  `SecurityLoginAttemptRecorder` backed by the Prisma audit login log
  repository.
- Updated `SystemManagementModule` and `SystemManagementController` so existing
  `/api/core/login-logs` read/export routes delegate to
  `AuditLoginLogService`, preserving route permissions and OpenAPI tags.
- Refreshed OpenAPI snapshot for the login-log query filters.
- Updated workspace path aliases and lockfile metadata for `@opencore/audit`.

## Audit Login Log Focused Verification

- Passed: `pnpm install --lockfile-only`
- Passed: `NX_DAEMON=false pnpm nx typecheck audit`
- Passed: `NX_DAEMON=false pnpm nx typecheck security`
- Passed: `NX_DAEMON=false pnpm nx typecheck api`
- Passed: `NX_DAEMON=false pnpm nx test audit`
- Passed: `NX_DAEMON=false pnpm nx test security`
- Passed: `NX_DAEMON=false pnpm nx test api`
- Passed: `NX_DAEMON=false pnpm nx lint audit`
- Passed: `NX_DAEMON=false pnpm nx lint security`
- Passed: `NX_DAEMON=false pnpm nx lint api`
- Passed: `pnpm prisma:seed`
- Passed: `pnpm openapi:export`
- Passed: `pnpm openapi:check`
- Passed: `pnpm openapi:registry-tags:check`
- Passed: `pnpm registry:admin-routes:check`

## Audit Login Log Full Round Verification

- Passed: `pnpm typecheck`
- Passed: `pnpm lint`
- Passed: `pnpm test`
- Passed: `pnpm build:api`
- Passed: `pnpm prisma:validate`
- Passed: `pnpm openapi:check`
- Passed: `pnpm format:check`

Notes:

- Initial `pnpm prisma:seed` failed because the seed script compiles through
  `tsconfig.base.json`; parameter decorators added to `SecurityAuthService`
  were removed so records-only seed paths remain compatible.
- `pnpm openapi:check` initially reported expected drift after login-log query
  filters moved into audit DTOs; `pnpm openapi:export` refreshed the snapshot
  and the check then passed.
- `NX_DAEMON=false pnpm nx test audit` covers 1 suite / 2 tests for seed
  list/filter/record/export and Prisma read/write integration.
- `NX_DAEMON=false pnpm nx test security` remains 3 suites / 16 tests and now
  verifies auth login attempts through the dedicated recorder port.
- `NX_DAEMON=false pnpm nx test api` remains 28 suites / 78 tests with auth
  tests using the audit seed recorder.
- `pnpm prisma:seed` passed with 104 permissions, 35 menus, 2 roles, 1 user and
  the current system-management baseline, including 2 login logs sourced from
  `@opencore/audit/records`.
- `pnpm lint` still reports the same existing Admin Biome style hints in
  `apps/admin/scripts/smoke-test.mjs` and
  `apps/admin/src/pages/shared/CurrentPageExportButton.tsx`; command exit code
  remains 0 and these files were not changed by the backend audit-login-log
  migration.
- `pnpm typecheck`, `pnpm lint` and `pnpm test` now run 15 Nx projects; the API
  typecheck/build dependency chain includes `audit`, `security` and `system`.

## Audit Login Log RuoYi/Yudao Reference Points

- Preserved the familiar management loop: login success/failure records,
  username/status filtering, paginated list and current-page export preview.
- Did not copy servlet filters or Java security events. The implementation uses
  a small recorder port consumed by `SecurityAuthService` and implemented by
  the audit package.

## Audit Login Log TS/NestJS Best-Practice Choice

- Login log write/query/export behavior lives in `@opencore/audit`; API modules
  only import the module/service for wiring and route aggregation.
- Auth remains lower-level than audit by depending on an abstract recorder port,
  not on the concrete audit package.
- Seed data uses `@opencore/audit/records` so Prisma seed does not import Nest
  runtime modules.

## Next Module After Audit Login Log

Next lowest incomplete module: `packages/audit-operation-log`.

---

## Audit Operation Log Round Module

Module: `packages/audit` / internal boundary `audit-operation-log`

Dependency level: eighteenth-lowest, after `audit-login-log`.

Why this module: operation logs depend on request context, database and audit
runtime primitives. Extracting them after login logs keeps write interception,
redaction, list filtering and export preview reusable while `apps/api` remains
startup, HTTP aggregation and provider wiring.

## Audit Operation Log Implemented

- Added the `audit-operation-log` sub-boundary under `@opencore/audit` with:
  - `AuditLogDto`, `AuditLogPageDto` and `AuditLogQueryDto`.
  - `AuditOperationLogRecord` seed records.
  - `AuditOperationLogRepository`, `SeedAuditOperationLogRepository` and
    `PrismaAuditOperationLogRepository`.
  - `AuditOperationLogService` and `AuditOperationLogModule`.
  - `AuditOperation` and `SkipAuditOperation` decorators.
  - `AuditOperationLogInterceptor`, exported compatibly as
    `AuditLogInterceptor`.
  - Page normalization, actor/action/resource filters, recursive metadata
    redaction and current-page export preview helper.
- Reused the existing `AuditLog` Prisma model; no schema migration was needed
  in this round.
- Moved audit operation seed records to `@opencore/audit/records` and updated
  `prisma/seed.ts` to consume both audit operation and login log seed records
  through that records-only boundary.
- Updated `AppModule` to import `AuditOperationLogModule` and register
  `AuditOperationLogInterceptor` as the global APP_INTERCEPTOR.
- Converted `apps/api/src/platform/audit/audit-log.interceptor.ts` into a
  compatibility re-export shim that points to `@opencore/audit`.
- Updated `SystemManagementModule` and `SystemManagementController` so existing
  `/api/core/audit-logs` read/export routes delegate to
  `AuditOperationLogService`, preserving route permissions and OpenAPI tags.
- Removed audit-log ownership from legacy system-management Prisma/seed
  repositories; the remaining system-management repository boundary now owns
  file metadata only.
- Refreshed OpenAPI snapshot for the audit-log query filters.
- Updated `@opencore/audit` package metadata and lockfile entries for the
  operation-log dependencies.

## Audit Operation Log Focused Verification

- Passed: `pnpm install --lockfile-only`
- Passed: `NX_DAEMON=false pnpm nx typecheck audit`
- Passed: `NX_DAEMON=false pnpm nx test audit`
- Passed: `NX_DAEMON=false pnpm nx lint audit`
- Passed: `NX_DAEMON=false pnpm nx typecheck api`
- Passed: `NX_DAEMON=false pnpm nx test api`
- Passed: `NX_DAEMON=false pnpm nx lint api`
- Passed: `pnpm prisma:seed`
- Passed: `pnpm openapi:export`
- Passed: `pnpm openapi:check`
- Passed: `pnpm openapi:registry-tags:check`
- Passed: `pnpm registry:admin-routes:check`

## Audit Operation Log Full Round Verification

- Passed: `pnpm typecheck`
- Passed: `pnpm lint`
- Passed: `pnpm test`
- Passed: `pnpm build:api`
- Passed: `pnpm prisma:validate`
- Passed: `pnpm openapi:check`
- Passed: `pnpm format:check`

Notes:

- `NX_DAEMON=false pnpm nx test audit` now covers 2 suites / 7 tests across
  login-log and operation-log boundaries.
- `NX_DAEMON=false pnpm nx test api` covers 28 suites / 76 tests, including the
  API compatibility interceptor shim and system-management route permission
  matrix.
- `pnpm prisma:seed` passed with 104 permissions, 35 menus, 2 roles, 1 user and
  the current system-management baseline, including 2 audit logs and 2 login
  logs sourced from `@opencore/audit/records`.
- `pnpm lint` still reports the same existing Admin Biome style hints in
  `apps/admin/scripts/smoke-test.mjs` and
  `apps/admin/src/pages/shared/CurrentPageExportButton.tsx`; command exit code
  remains 0 and these files were not changed by the backend
  audit-operation-log migration.
- `pnpm test` still emits the known Jest worker teardown warning in the broader
  matrix while exiting 0.
- `pnpm format:check` initially reported only `pnpm-lock.yaml` after the
  lockfile update; formatting the lockfile and rerunning `pnpm format:check`
  passed.
- `pnpm typecheck`, `pnpm lint` and `pnpm test` run 15 Nx projects; the API
  typecheck/build dependency chain includes `audit`, `security` and `system`.

## Audit Operation Log RuoYi/Yudao Reference Points

- Preserved the familiar management loop: operation records, actor/action/
  resource filtering, paginated list and current-page export preview.
- Kept request write interception and metadata redaction, but did not copy Java
  servlet filters or annotation mechanics. NestJS decorators and a global
  interceptor provide the equivalent boundary.

## Audit Operation Log TS/NestJS Best-Practice Choice

- Operation log write/query/export behavior lives in `@opencore/audit`; API
  modules only import the module/service/interceptor for wiring and route
  aggregation.
- The interceptor uses metadata-driven overrides for action/resource/resourceId
  and remains method-gated for POST/PUT/PATCH/DELETE writes.
- Seed data uses `@opencore/audit/records` so Prisma seed does not import Nest
  runtime modules.

## Next Module After Audit Operation Log

Next lowest incomplete module: `packages/online-user`.

---

## Online User Round Module

Module: `packages/online-user`

Dependency level: nineteenth-lowest, after `audit-operation-log`.

Why this module: online-user management depends on auth/session semantics,
database access and monitor route aggregation. Extracting it before scheduler
and monitor keeps session visibility and force logout reusable while later
monitor packages can consume only the summary/service boundary.

## Online User Implemented

- Added `@opencore/online-user` as an Nx workspace library with package
  metadata, TypeScript configs, Jest config, README and records-only export
  `@opencore/online-user/records`.
- Added the online-user runtime boundary with:
  - `OnlineUserSessionDto`, `OnlineUserSessionPageDto`, `OnlineUserQueryDto`,
    `KickOutSessionDto` and `OnlineUserSummaryDto`.
  - `OnlineUserSessionRecord` seed records.
  - `OnlineUserRepository`, `SeedOnlineUserRepository` and
    `PrismaOnlineUserRepository`.
  - `OnlineUserService` and `OnlineUserModule`.
  - Bounded pagination, active/username filters, active/revoked summary and
    kick-out active-state guard.
- Added Prisma migration `20260611230000_online_user_revoke_audit`; it creates
  `OnlineUserSession` for older local databases where operations tables were
  not yet present in migrations and adds `revokedBy` / `revokedReason` columns
  for persisted force-logout audit context.
- Updated `prisma/seed.ts` to import online-user session seed records from
  `@opencore/online-user/records` and write `onlineUserSessions: 1`.
- Updated `OperationsModule` to import `OnlineUserModule`.
- Updated `OperationsController` so `/api/monitor/online-users`,
  `/api/monitor/online-users/:id` and
  `/api/monitor/online-users/:id/kick-out` delegate to `OnlineUserService`.
- Updated operations summary composition so the operations repository receives
  an `OnlineUserSummaryDto` instead of directly querying online sessions.
- Removed online-user list/detail/kick-out ownership from legacy API
  operations repositories.
- Refreshed OpenAPI snapshot for the online-user username filter and package
  DTO source.
- Extended the SDK online-user query type with `username`.
- Updated workspace path aliases and lockfile metadata for
  `@opencore/online-user`.

## Online User Focused Verification

- Passed: `pnpm prisma:generate`
- Passed: `pnpm prisma:migrate`
- Passed: `pnpm install --lockfile-only`
- Passed: `NX_DAEMON=false pnpm nx typecheck online-user`
- Passed: `NX_DAEMON=false pnpm nx test online-user`
- Passed: `NX_DAEMON=false pnpm nx lint online-user`
- Passed: `NX_DAEMON=false pnpm nx typecheck api`
- Passed: `NX_DAEMON=false pnpm nx test api`
- Passed: `NX_DAEMON=false pnpm nx lint api`
- Passed: `NX_DAEMON=false pnpm nx typecheck sdk`
- Passed: `NX_DAEMON=false pnpm nx test sdk`
- Passed: `NX_DAEMON=false pnpm nx lint sdk`
- Passed: `pnpm prisma:seed`
- Passed: `pnpm openapi:export`
- Passed: `pnpm openapi:check`
- Passed: `pnpm openapi:registry-tags:check`
- Passed: `pnpm registry:admin-routes:check`

## Online User Full Round Verification

- Passed: `pnpm typecheck`
- Passed: `pnpm lint`
- Passed: `pnpm test`
- Passed: `pnpm build:api`
- Passed: `pnpm prisma:validate`
- Passed: `pnpm openapi:check`
- Passed: `pnpm format:check`

Notes:

- The first `pnpm prisma:migrate` attempt failed because the local migration
  history did not include the pre-existing `OnlineUserSession` schema model.
  The new migration was changed to create the table if needed and add revoke
  audit columns idempotently, then the failed attempt was marked rolled back and
  `pnpm prisma:migrate` passed.
- `NX_DAEMON=false pnpm nx test online-user` covers 1 suite / 2 tests for seed
  list/filter/summary/kick-out behavior and Prisma persistence of
  `revokedBy` / `revokedReason`.
- `NX_DAEMON=false pnpm nx test api` covers 28 suites / 75 tests after moving
  online-user behavior out of the operations repository suite.
- `pnpm prisma:seed` passed with 104 permissions, 35 menus, 2 roles, 1 user, 1
  online user session and the current system-management baseline.
- `pnpm lint` still reports the same existing Admin Biome style hints in
  `apps/admin/scripts/smoke-test.mjs` and
  `apps/admin/src/pages/shared/CurrentPageExportButton.tsx`; command exit code
  remains 0 and these files were not changed by the backend online-user
  migration.
- `pnpm test` still emits the known Jest worker teardown/listener warnings in
  the broader matrix while exiting 0.
- `pnpm format:check` initially reported only `pnpm-lock.yaml` after the
  lockfile update; formatting the lockfile and rerunning `pnpm format:check`
  passed.
- `pnpm typecheck`, `pnpm lint` and `pnpm test` run 16 Nx projects; the API
  typecheck/build dependency chain includes `online-user`, `audit`, `security`
  and `system`.

## Online User RuoYi/Yudao Reference Points

- Preserved the familiar monitor online-user loop: active/revoked list,
  username filtering, session detail and force logout with repeat kick-out
  rejection.
- Did not copy servlet session registries. The package exposes explicit
  repository/service ports that can later be backed by token/session events.

## Online User TS/NestJS Best-Practice Choice

- Online-user behavior lives in `@opencore/online-user`; API operations routes
  only wire the service into HTTP endpoints and summary composition.
- Kick-out state is persisted through Prisma with explicit `revokedAt`,
  `revokedBy` and `revokedReason` fields instead of returning transient audit
  context from the API only.
- Seed data uses `@opencore/online-user/records` so Prisma seed does not import
  Nest runtime modules.

## Next Module After Online User

Completed next lowest incomplete module: `packages/scheduler`.

## Scheduler Round Module

Target: BE20-P20 `packages/scheduler`.

Dependency position:

- Runs after online-user because scheduler composes monitor operations runtime
  but must still remain below the higher-level monitor package.
- Keeps job definitions, run logs, cron validation and job registry policy out
  of the API aggregation layer.

## Scheduler Implemented

- Added `@opencore/scheduler` as a workspace/Nx package with build, lint,
  typecheck and Jest targets.
- Added package exports for `@opencore/scheduler` and
  `@opencore/scheduler/records`, with TypeScript path aliases in
  `tsconfig.base.json`.
- Moved scheduler-owned DTOs, seed records, registry entries, repository
  contract, seed repository, Prisma repository, service and module into
  `packages/scheduler`.
- Added a registry whitelist for supported job definitions. Current entries:
  `openapi.drift-check` on the `maintenance` queue and `report.refresh` on the
  `reports` queue.
- Enforced scheduler safety policy:
  - job code must exist in the registry;
  - job queue must match the registered queue;
  - retry limit must be between 0 and 10;
  - timeout must be between 1 and 3600 seconds;
  - cron expressions must be 5 or 6 bounded cron fields.
- Manual trigger now records BullMQ-oriented metadata including adapter and
  handler key, while keeping execution simulated in the repository boundary
  until a real worker package is introduced.
- Added Prisma migration `20260611233000_scheduler_runtime` to create
  `JobDefinition` and `JobRunLog` tables for older local databases.
- Updated Prisma seed to import `seedSchedulerJobs` and `seedSchedulerRuns`
  from `@opencore/scheduler/records`; local seed now writes one scheduler job
  and one run log.
- Updated `OperationsModule` to import `SchedulerModule`.
- Updated `OperationsController` so existing `/api/monitor/jobs` routes keep
  the same route and permission contract but delegate behavior to
  `SchedulerService`.
- Removed scheduler table ownership from legacy operations seed/Prisma
  repositories; operations summary now receives scheduler summary data from the
  scheduler package.
- Kept `apps/api/src/modules/monitor/operations/operations.seed.ts`
  compatibility exports for older callers while sourcing records from
  `@opencore/scheduler/records`.

## Scheduler Focused Verification

- `pnpm install --lockfile-only` pass; lockfile now includes
  `packages/scheduler` importer metadata.
- `pnpm prisma:generate` pass.
- `pnpm prisma:migrate` pass; migration
  `20260611233000_scheduler_runtime` applied locally.
- `pnpm prisma:seed` pass; seed output includes
  `scheduler: { jobs: 1, jobRuns: 1 }`.
- `NX_DAEMON=false pnpm nx typecheck scheduler` pass.
- `NX_DAEMON=false pnpm nx test scheduler` pass; scheduler package currently
  has 1 suite / 3 tests.
- `NX_DAEMON=false pnpm nx lint scheduler` pass after removing a redundant cron
  regex escape and unused import.
- `NX_DAEMON=false pnpm nx typecheck api` pass.
- `NX_DAEMON=false pnpm nx test api` pass; API currently has 28 suites / 73
  tests.
- `NX_DAEMON=false pnpm nx lint api` pass.
- `pnpm openapi:export` pass.
- `pnpm openapi:check` pass.
- `pnpm openapi:registry-tags:check` pass.
- `pnpm registry:admin-routes:check` pass.
- `pnpm sdk:check` pass.
- `NX_DAEMON=false pnpm nx typecheck sdk` pass.
- `NX_DAEMON=false pnpm nx test sdk` pass; SDK currently has 8 suites / 13
  tests.
- `NX_DAEMON=false pnpm nx lint sdk` pass.

## Scheduler Full Round Verification

Scheduler migration full gates all passed after the P20 implementation:

- `pnpm typecheck` pass; Nx matrix contains 17 projects including
  `scheduler`.
- `pnpm lint` pass; existing Admin Biome hints remain non-failing.
- `pnpm test` pass; Nx matrix contains 17 projects and includes scheduler
  tests.
- `pnpm build:api` pass; API build dependency chain includes
  `scheduler:build`.
- `pnpm prisma:validate` pass.
- `pnpm openapi:check` pass.
- `pnpm format:check` pass.

## Scheduler RuoYi/Yudao Reference Points

- RuoYi/Yudao both expose scheduled job definition management, run logs and
  manual trigger workflows.
- OpenCore keeps the useful operational loop but does not copy Java reflection
  invocation patterns.
- Job invocation is constrained by a registry whitelist and queue binding,
  making accidental arbitrary handler execution unavailable from the API.

## Scheduler TS/NestJS Best-Practice Choice

- Uses a Nest package boundary with repository/service/module exports instead
  of adding more scheduler logic to `apps/api`.
- Uses Prisma repositories for persistence and seed repositories for bounded
  package tests.
- Carries BullMQ adapter metadata in records and run logs while deferring real
  worker execution to the future monitor/queue worker layer.
- Keeps API aggregation stable: routes and permissions stay in operations, but
  scheduler behavior is owned by `@opencore/scheduler`.

## Next Module After Scheduler

Completed next lowest incomplete module: `packages/monitor`.

## Monitor Round Module

Target: BE20-P21 `packages/monitor`.

Dependency position:

- Runs after scheduler because monitor diagnostics can observe queue and runtime
  state but should not own scheduler job management.
- Keeps health, dependency, Redis, S3, server/version and read-only queue
  diagnostics reusable outside the API aggregation module.

## Monitor Implemented

- Added `@opencore/monitor` as a workspace/Nx package with build, lint,
  typecheck and Jest targets.
- Added package exports for `@opencore/monitor` and
  `@opencore/monitor/records`, with TypeScript path aliases in
  `tsconfig.base.json`.
- Moved monitor DTOs, health response generation, runtime diagnostics,
  repository, service, module and queue-name records into `packages/monitor`.
- Runtime diagnostics now use `@opencore/database`, `@opencore/redis` and
  `@opencore/file` package boundaries instead of API-local helper logic.
- Preserved read-only BullMQ queue status for `system-audit` and
  `table-export`; no scheduler control surface is exposed through monitor
  diagnostics.
- `HealthController` still owns `/api/health/live` and `/api/health/ready` in
  API aggregation, but delegates response generation to `MonitorHealthService`.
- `MonitoringController` still owns `/api/monitor/status`,
  `/api/monitor/version` and `/api/monitor/queues`, but delegates behavior to
  `MonitorService`.
- API monitoring DTO/repository/runtime-diagnostics files are compatibility
  re-export shims, keeping old local import paths working while removing
  reusable runtime ownership from `apps/api`.

## Monitor Focused Verification

- `pnpm install --lockfile-only` pass; lockfile now includes
  `packages/monitor` importer metadata.
- `NX_DAEMON=false pnpm nx typecheck monitor` pass after aligning the new
  package tsconfig with the repository's decorator settings.
- `NX_DAEMON=false pnpm nx test monitor` pass; monitor package currently has 1
  suite / 6 tests.
- `NX_DAEMON=false pnpm nx lint monitor` pass.
- `NX_DAEMON=false pnpm nx typecheck api` pass; API dependency chain includes
  `monitor:typecheck`.
- `NX_DAEMON=false pnpm nx test api` pass; API currently has 28 suites / 73
  tests.
- `NX_DAEMON=false pnpm nx lint api` pass.
- `pnpm openapi:export` pass.
- `pnpm openapi:check` pass.
- `pnpm openapi:registry-tags:check` pass.
- `pnpm registry:admin-routes:check` pass.
- `pnpm sdk:check` pass.
- `NX_DAEMON=false pnpm nx typecheck sdk` pass.
- `NX_DAEMON=false pnpm nx test sdk` pass; SDK currently has 8 suites / 13
  tests.
- `NX_DAEMON=false pnpm nx lint sdk` pass.

## Monitor Full Round Verification

Monitor migration full gates all passed after the P21 implementation:

- `pnpm typecheck` pass; Nx matrix contains 18 projects including `monitor`.
- `pnpm lint` pass; existing Admin Biome hints remain non-failing.
- `pnpm test` pass; Nx matrix contains 18 projects and includes monitor tests.
- `pnpm build:api` pass; API build dependency chain includes `monitor:build`.
- `pnpm prisma:validate` pass.
- `pnpm openapi:check` pass.
- `pnpm format:check` pass.

## Monitor RuoYi/Yudao Reference Points

- RuoYi/Yudao expose server status, cache/Redis status and job/queue runtime
  visibility as operational monitor pages.
- OpenCore keeps the useful read-only observability loop but avoids coupling it
  to Java-specific servlet/thread/runtime models.
- Queue diagnostics are deliberately read-only and separate from scheduler job
  management.

## Monitor TS/NestJS Best-Practice Choice

- Uses a package-owned `MonitorModule` with injectable health, service,
  repository and diagnostics providers.
- Uses existing Redis/File/Database package contracts for runtime probes rather
  than duplicating low-level client setup in `apps/api`.
- Keeps health and monitor HTTP controllers in API aggregation, but leaves all
  reusable behavior in `@opencore/monitor`.
- Preserves compatibility re-export shims while making the ownership boundary
  explicit for future generator and API aggregation work.

## Next Module After Monitor

Next lowest incomplete module: `packages/generator-core`.

## Generator Core Round Module

Target: BE20-P22 `packages/generator-core`.

Dependency position:

- Runs after monitor because OpenForge generator internals are development-time
  infrastructure and should not be extracted before runtime packages are
  separated.
- Runs before the `tools/generator` alignment round so CLI behavior can remain a
  thin wrapper around a stable package-owned generation core.

## Generator Core Implemented

- Added `@opencore/generator-core` as a workspace/Nx package with build, lint,
  typecheck and Jest targets.
- Added package metadata and TypeScript path alias for
  `@opencore/generator-core`; lockfile importer metadata now includes the new
  package.
- Moved OpenForge core directories from `tools/generator/src` into
  `packages/generator-core/src`: schema/config loading, readers, validators,
  hashing, planning, output formatting, diffing, preflight, template rendering,
  VFS, safe apply, rollback, doctor checks and generated-module e2e tests.
- Added `getOpenForgeGeneratorCoreStatus()` so the core package exposes its own
  read-only S9 status without claiming to be the CLI package.
- Kept `@opencore/openforge` as the CLI package and compatibility entrypoint:
  `tools/generator/src/index.ts` re-exports `@opencore/generator-core` while
  preserving `OPENFORGE_CLI_COMMANDS` and `getOpenForgeWorkspaceStatus()`.
- Updated `tools/generator/src/cli.ts` to import generator behavior from
  `@opencore/generator-core` instead of local relative core directories.
- Updated `pnpm openforge:test` to run both `generator-core` and `openforge`
  tests so moved core coverage remains part of the OpenForge gate.
- Extended `runOpenForgeDoctor()` to verify the extracted
  `packages/generator-core/project.json` in addition to the existing
  `tools/generator/project.json`.

## Generator Core Focused Verification

- `pnpm install --lockfile-only` pass; lockfile now includes
  `packages/generator-core` importer metadata.
- `NX_DAEMON=false pnpm nx typecheck generator-core` pass; dependency chain
  includes shared, contracts and module-registry.
- `NX_DAEMON=false pnpm nx test generator-core` pass; generator-core currently
  has 13 suites / 54 tests and 4 snapshots.
- `NX_DAEMON=false pnpm nx lint generator-core` pass.
- `NX_DAEMON=false pnpm nx typecheck openforge` pass; dependency chain includes
  `generator-core:typecheck`.
- `NX_DAEMON=false pnpm nx test openforge` pass; CLI package currently has 2
  suites / 12 tests.
- `NX_DAEMON=false pnpm nx lint openforge` pass.
- `pnpm openforge:doctor` pass; doctor output includes
  `generator-core-project`.
- `pnpm openforge:check -- --schema tools/generator/examples/core.dict.v1.schema.json`
  pass.
- `pnpm openforge:diff -- --schema tools/generator/examples/core.dict.v1.schema.json --format json`
  pass.
- `pnpm openforge:plan -- --schema tools/generator/examples/core.dict.v1.schema.json --format json`
  pass.
- `pnpm openforge:test` pass; runs generator-core and openforge suites.

## Generator Core Full Round Verification

Generator-core migration full gates all passed after the P22 implementation:

- `pnpm typecheck` pass; Nx matrix contains 19 projects including
  `generator-core`.
- `pnpm lint` pass; existing Admin Biome hints remain non-failing.
- `pnpm test` pass; Nx matrix contains 19 projects and includes generator-core
  tests.
- `pnpm build:api` pass; API build dependency graph remains unaffected by the
  development-time generator-core package.
- `pnpm prisma:validate` pass.
- `pnpm openapi:check` pass.
- `pnpm format:check` pass.

## Generator Core RuoYi/Yudao Reference Points

- RuoYi/Yudao generator tooling separates metadata definition, template
  rendering and generated artifact output from runtime controller/service
  execution.
- OpenCore keeps the useful generator pipeline separation but models it as a
  TypeScript package instead of Java reflection/template runtime coupling.
- OpenForge remains no-write by default; safe apply and rollback stay explicit
  and manifest-driven.

## Generator Core TS/NestJS Best-Practice Choice

- Uses a package boundary for generator core logic so CLI entrypoints do not own
  reusable code generation behavior.
- Keeps generated output deterministic through stable hashes, VFS entries and
  package-owned tests.
- Keeps the CLI wrapper thin and behavior-compatible for existing
  `pnpm openforge:*` scripts.
- Leaves the final `tools/generator` documentation/UX alignment for the next
  ordered module.

## Next Module After Generator Core

Next lowest incomplete module: `tools/generator`.
