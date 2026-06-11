# OpenCore Quality Cycle 001 Implementation Notes

## Q001-AUDIT-001

Evidence:

- `docs/quality-cycle/cycle-001/audit.md` now records current OpenCore state across README/docs/API/Admin/contracts/SDK/module-registry/OpenForge/runtime.
- Verified current repo state with `node tools/quality-cycle/opencore-quality-cycle.mjs status --max 20`, `start-cycle --max 20`, `git status --short`, and targeted source inspection.

## Q001-AUDIT-002

Evidence:

- `docs/quality-cycle/cycle-001/reference-comparison.md` records inspected NestWeb permission, menu, message, approval, queue, system-log, OpenAPI, and Prisma sources.
- Reference clone inspected at `/tmp/opencore-quality-refs/NestWeb`.

## Q001-AUDIT-003

Evidence:

- `docs/quality-cycle/cycle-001/reference-comparison.md` records inspected Antdpro6 access, routes, TableExportButton, ResultStates, Dashboard, Auth/System/Security, MessageCenter, Approvals, services, and e2e sources.
- Reference clone inspected at `/tmp/opencore-quality-refs/Antdpro6`.

## Q001-AUDIT-004

Evidence:

- `docs/quality-cycle/cycle-001/reference-comparison.md` records ruoyi-vue-pro module map across system, infra, monitor/job framework, bpm/workflow, report, pay, member, mall, crm, erp, mes, wms, iot, and ai.
- Reference clone inspected at `/tmp/opencore-quality-refs/ruoyi-vue-pro`.

## Q001-AUDIT-005

Evidence:

- `docs/quality-cycle/cycle-001/reference-comparison.md` records yudao-ui-admin-vue3 frontend/API map across system, infra, bpm, report, mall, member, crm, erp, iot, ai, login/auth, permission/menu, and codegen.
- Reference clone inspected at `/tmp/opencore-quality-refs/yudao-ui-admin-vue3`.

## Q001-AUDIT-006

Evidence:

- `docs/quality-cycle/cycle-001/audit.md` includes an ordered implementation sequence that starts with audit/accounting, then Phase 1 and contract/OpenForge gates, before bounded collaboration/workflow/integration work.
- The sequence explicitly avoids P4/P5 industry packages and keeps OpenForge/contract gates before cycle closeout.

## Q001-P1-RBAC-CRUD

Evidence:

- `apps/api/src/modules/core/rbac/rbac.controller.ts` now exposes create/update/delete/export endpoints for users, roles, permissions, and menus, each guarded by the matching `core:*:{create,update,delete,export}` permission code.
- `apps/api/src/modules/core/rbac/rbac.repository.ts`, `seed-rbac.repository.ts`, and `prisma-rbac.repository.ts` now implement RBAC mutations using stable identifiers: `user.id`, `role.code`, `permission.code`, and `menu.key`.
- `packages/sdk/src/rbac-client.ts` and `packages/sdk/src/rbac-types.ts` now cover RBAC create/update/delete/export methods and request/response types.
- `apps/admin/src/pages/System/RbacTable.tsx` now exposes RBAC create/export toolbar actions and edit/delete row actions consistently across Users, Roles, Permissions, and Menus pages.
- Added/updated tests:
  - `apps/api/src/modules/core/rbac/rbac.repository.spec.ts`
  - `apps/api/src/modules/core/rbac/rbac.permission-matrix.spec.ts`
  - `packages/sdk/src/rbac-client.spec.ts`
- Verification commands passed:
  - `NX_DAEMON=false pnpm nx test api --runInBand`
  - `NX_DAEMON=false pnpm nx test sdk --runInBand`
  - `NX_DAEMON=false pnpm nx typecheck api`
  - `NX_DAEMON=false pnpm nx typecheck admin`

## Q001-P1-RBAC-MATRIX

Evidence:

- `apps/api/src/modules/core/rbac/permission.guard.spec.ts` now covers:
  - authorized bearer token with required permission,
  - authenticated user missing a permission,
  - no bearer token,
  - user disabled after login,
  - dangerous operation denial for `core:user:delete`.
- `apps/api/src/modules/core/rbac/rbac.permission-matrix.spec.ts` verifies every RBAC route method is decorated with the expected registry permission code.
- Verification command passed:
  - `NX_DAEMON=false pnpm nx test api --runInBand`

## Q001-P1-AUTH-SESSION

Evidence:

- `apps/api/src/modules/core/rbac/auth.service.ts` now signs tokens with `iat` and `exp`, returns a matching 3600-second TTL, and rejects expired bearer tokens.
- `apps/api/src/modules/core/rbac/auth.controller.ts` passes login request metadata into `AuthService`.
- `RbacRepository.recordLoginAttempt` is implemented by `seed-rbac.repository.ts` and `prisma-rbac.repository.ts`; Prisma writes to the existing `LoginLog` model.
- `apps/api/src/modules/core/rbac/auth.service.spec.ts` now verifies successful login logging, failed login logging, token expiry rejection, malformed token rejection, and disabled/missing user rejection remains enforced through bearer authentication.
- Verification commands passed:
  - `NX_DAEMON=false pnpm nx test api --runInBand`
  - `NX_DAEMON=false pnpm nx typecheck api`

## Q001-P1-AUDIT-INTERCEPTOR

Evidence:

- `apps/api/src/platform/audit/audit-log.interceptor.ts` adds a global HTTP interceptor for `POST`, `PATCH`, `PUT`, and `DELETE` routes, recording actor, method, path, status code, IP, user agent, request id, trace id, and redacted metadata.
- `apps/api/src/app/app.module.ts` registers the interceptor with `APP_INTERCEPTOR` and imports `DatabaseModule`.
- `apps/api/src/platform/audit/audit-log.interceptor.spec.ts` covers successful write audit logs, failed write audit logs, GET skip behavior, and recursive redaction.
- Verification commands passed:
  - `NX_DAEMON=false pnpm nx test api --runInBand`
  - `NX_DAEMON=false pnpm nx typecheck api`

## Q001-P1-CONFIG-SECRET

Evidence:

- `SystemConfigDto` and SDK `SystemConfigSummary` now expose `visibility: public | private | secret`.
- `system-management.repository.ts` now requires secret-like keys to be explicitly created with `visibility: secret`, rejects non-secret keys marked as secret, redacts secret values as `[REDACTED]`, and removes `value` from config export-preview columns.
- `seed-system-management.repository.ts` and `prisma-system-management.repository.ts` now use the same visibility/redaction helpers.
- `apps/admin/src/pages/System/Config.tsx` displays config visibility.
- Tests verify explicit secret requirement, secret redaction, and export-preview columns.
- Verification commands passed:
  - `NX_DAEMON=false pnpm nx test api --runInBand`
  - `NX_DAEMON=false pnpm nx test sdk --runInBand`
  - `NX_DAEMON=false pnpm nx typecheck api`
  - `NX_DAEMON=false pnpm nx typecheck admin`

## Q001-P1-FILE-STORAGE

Evidence:

- `apps/api/src/modules/core/system-management/system-management.controller.ts` now exposes `PATCH /core/files/:id` guarded by `core:file:update`.
- `SystemManagementRepository`, `seed-system-management.repository.ts`, and `prisma-system-management.repository.ts` now support safe file metadata updates and regenerate deterministic storage keys from the configured prefix/name/mime/size contract.
- `packages/sdk/src/system-management-client.ts` and `system-management-types.ts` now include `updateFileAsset`.
- Tests verify metadata update, delete, and export-preview columns for files.
- Verification commands passed:
  - `NX_DAEMON=false pnpm nx test api --runInBand`
  - `NX_DAEMON=false pnpm nx test sdk --runInBand`
  - `NX_DAEMON=false pnpm nx typecheck api`
  - `NX_DAEMON=false pnpm nx typecheck admin`

## Q001-P1-MONITOR-PROBES

Evidence:

- `apps/api/src/modules/monitor/monitoring/runtime-diagnostics.service.ts` now wraps the DB probe in the same bounded timeout model already used for Redis/BullMQ/S3.
- `apps/api/src/modules/monitor/monitoring/monitoring.repository.spec.ts` now verifies degraded dependency propagation without leaking runtime connection details.
- Existing runtime diagnostics tests cover PostgreSQL, Redis, BullMQ, and S3 success checks without leaking database/Redis/S3 secrets.
- Admin Monitor smoke is covered by `apps/admin/scripts/smoke-test.mjs`, which checks `/monitor/status`, `/monitor/version`, and `/monitor/queues`.
- Verification commands passed:
  - `NX_DAEMON=false pnpm nx test api --runInBand`
  - `NX_DAEMON=false pnpm nx typecheck api`
  - `pnpm --dir apps/admin test`

## Q001-P1-OBSERVABILITY

Evidence:

- `request-context.middleware.ts` already returns `x-request-id` and `x-trace-id` response headers and stores both in async request context.
- `error-response.ts` and `HttpExceptionFilter` already include request id and trace id in error responses.
- `audit-log.interceptor.spec.ts` now verifies audit logs store the same request id and trace id from request context.
- `structured-logger.ts` now falls back to the active request context when no explicit request context is passed.
- `structured-logger.spec.ts` now verifies default request-context logging.
- Verification commands passed:
  - `NX_DAEMON=false pnpm nx test api --runInBand`
  - `NX_DAEMON=false pnpm nx typecheck api`

## Q001-P2-SDK-GENERATE

Evidence:

- Root `package.json` now exposes `sdk:generate` and `sdk:check`.
- `tools/scripts/check-sdk-generate.mjs` verifies the root scripts, `OPENAPI_CONTRACT_PROTOCOL.sdkGenerateCommand`, and SDK public exports.
- `packages/contracts/src/index.spec.ts` now locks the root scripts against the OpenAPI contract protocol.
- Verification commands passed:
  - `pnpm sdk:generate`
  - `pnpm sdk:check`
  - `NX_DAEMON=false pnpm nx test contracts --runInBand`
  - `NX_DAEMON=false pnpm nx typecheck contracts`

## Q001-P2-OPENAPI-REGISTRY-TAG-DRIFT

Evidence:

- `apps/api/src/platform/openapi/openapi.ts` now emits registry `apiTags` into the generated OpenAPI document.
- `apps/api/src/platform/openapi/check-registry-tags.ts` compares registry tags with OpenAPI top-level and operation tags and reports missing module/tag/path evidence.
- `apps/api/src/platform/openapi/check-openapi-drift.ts` now runs the registry tag check as part of `pnpm openapi:check`.
- Controllers now apply registered module tags to their OpenAPI operations.
- `packages/contracts/openapi/opencore-api.json` was regenerated with current API paths and tags.
- Verification commands passed:
  - `pnpm openapi:export`
  - `pnpm openapi:registry-tags:check`
  - `pnpm openapi:check`
  - `NX_DAEMON=false pnpm nx test module-registry --runInBand`

## Q001-P2-ADMIN-ROUTE-ACCESS-DRIFT

Evidence:

- `tools/scripts/check-admin-route-access.ts` validates module registry Admin routes against `apps/admin/.umirc.ts` and permission codes against `apps/admin/src/access.ts`.
- Root `package.json` now exposes `registry:admin-routes:check`.
- `apps/admin` now has `/tools/openforge`, `canReadOpenForge`, an OpenForge page, and shell registry inclusion for `tool.openforge`.
- Verification commands passed:
  - `pnpm registry:admin-routes:check`
  - `pnpm --dir apps/admin test`

## Q001-P2-PERMISSION-DEPRECATION

Evidence:

- `packages/contracts/src/permission-deprecation.ts` defines `PERMISSION_DEPRECATION_POLICY`, `PermissionDeprecationPlan`, and `validatePermissionDeprecationPlan`.
- `docs/development/permission-deprecation-policy.md` documents the no-silent-delete policy, required migration metadata, compatibility window, and prohibited removals.
- Verification commands passed:
  - `NX_DAEMON=false pnpm nx test contracts --runInBand`
  - `NX_DAEMON=false pnpm nx typecheck contracts`

## Q001-P2-CONTRACT-PAGINATION

Evidence:

- `packages/contracts/src/api-contract.ts` defines `PageRequest`, `PageResponse<T>`, `QueryRequest`, `SortDescriptor`, `FilterDescriptor`, and `normalizePageRequest`.
- `docs/development/export-upload-contract.md` documents the shared pagination/sort/filter structure used by API/SDK/Admin surfaces.
- Verification commands passed:
  - `NX_DAEMON=false pnpm nx test contracts --runInBand`
  - `NX_DAEMON=false pnpm nx test sdk --runInBand`
  - `NX_DAEMON=false pnpm nx typecheck admin`

## Q001-P2-CONTRACT-ERROR

Evidence:

- `packages/contracts/src/api-contract.ts` defines `ApiErrorResponseContract`.
- `apps/api/src/platform/errors/error-response.ts` now aliases the API error response type to the shared contract.
- Existing error response tests verify stable error code, message, status code, path, request id, trace id, and timestamp.
- Verification commands passed:
  - `NX_DAEMON=false pnpm nx test api --runInBand`
  - `NX_DAEMON=false pnpm nx test contracts --runInBand`

## Q001-P2-CONTRACT-EXPORT-UPLOAD

Evidence:

- `packages/contracts/src/api-contract.ts` defines `ExportPreviewContract`, `FileUploadContract`, and `FileDownloadContract`.
- `packages/contracts/src/table-export-contract.ts` continues to define the bounded current-page export protocol.
- `docs/development/export-upload-contract.md` documents export, upload, download, redaction, and storage-key expectations.
- Verification commands passed:
  - `NX_DAEMON=false pnpm nx test contracts --runInBand`
  - `NX_DAEMON=false pnpm nx test api --runInBand`
  - `NX_DAEMON=false pnpm nx test sdk --runInBand`

## Q001-P2-MODULE-ADMISSION

Evidence:

- `docs/development/module-admission-checklist.md` defines admission checks for collaboration, workflow/report/job, and integration modules before registry entry.
- The checklist requires permission/menu/OpenAPI/Admin/SDK/test evidence and preserves the scope guard against CRM/ERP/MES/WMS/mall/member/tenant/pay production/AI/RAG/Agent entering core.
- Verification commands passed:
  - `pnpm registry:admin-routes:check`
  - `pnpm openapi:registry-tags:check`

## Q001-P3-CONTRACTS-V1

Evidence:

- `packages/contracts/src/openforge-contract.ts` defines the OpenForge V1 protocol, default template pack, generated marker signature, apply request/result, manifest, rollback plan/result, patch plan, generator config, and write policy contracts.
- `packages/contracts/src/index.spec.ts` validates V1 contract exports, generated marker parsing/formatting, apply safety requirements, manifest, rollback, and patch-plan shapes.
- Verification commands passed:
  - `NX_DAEMON=false pnpm nx test contracts --runInBand`
  - `pnpm openforge:doctor`

## Q001-P3-SCHEMA-CONFIG-DSL

Evidence:

- `packages/contracts/src/openforge-contract.ts` defines `OpenForgeManualSchema` with fields, relations, list, filter, sort, form, detail, actions, permissions, OpenAPI, Admin, SDK, tests, docs, export, storage, audit, and Prisma draft sections.
- `tools/generator/src/schema/schema-v1.ts`, `validators/manual-schema-validator.ts`, and `config/generator-config.ts` implement V1 schema/config loading and validation.
- Example schemas under `tools/generator/examples/*.v1.schema.json` cover valid and invalid registry, permission, OpenAPI, P4/P5, and protected-path cases.
- Verification commands passed:
  - `pnpm openforge:check`
  - `NX_DAEMON=false pnpm nx test openforge --runInBand`

## Q001-P3-TEMPLATE-PACK

Evidence:

- `tools/generator/src/templates/default-template-pack.ts` registers `openforge-default-nest-umi-v1` with 28 templates spanning API, Admin, SDK, docs, tests, Prisma draft/hints, and patch plans.
- `tools/generator/src/render/render-template-pack.ts` renders the template pack from V1 schemas.
- `openforge:doctor` verifies the default pack renders safely with 28 rendered files.
- Verification commands passed:
  - `pnpm openforge:doctor`
  - `NX_DAEMON=false pnpm nx test openforge --runInBand`

## Q001-P3-VFS

Evidence:

- `tools/generator/src/vfs/virtual-file-system.ts` and `render-template-pack.ts` produce deterministic virtual files with stable content hashes.
- Rendered generated files include `@generated by OpenForge` markers with template version, schema hash, module code, artifact kind, and generated timestamp.
- Snapshot tests in `tools/generator/src/render/render-template-pack.spec.ts` lock representative template output.
- Verification command passed:
  - `NX_DAEMON=false pnpm nx test openforge --runInBand`

## Q001-P3-SAFE-APPLY

Evidence:

- `tools/generator/src/apply/apply-writer.ts` implements `openforge:apply`; dry-run is the default, write mode requires `--yes`, writes are repo-relative, protected paths are blocked, and updates require an existing OpenForge generated marker.
- `tools/generator/src/apply/apply-writer.spec.ts` covers dry-run behavior, explicit write confirmation, create/update/no-op handling, human-authored conflict blocking, and rollback-on-write-failure behavior.
- Verification commands passed:
  - `pnpm openforge:gate`
  - `NX_DAEMON=false pnpm nx test openforge --runInBand`

## Q001-P3-MANIFEST

Evidence:

- `apply-writer.ts` writes `.openforge/manifests/*.json` only for real write applies with changes.
- Manifest entries record schema, registry, OpenAPI, and config hashes, target paths, before/after hashes, rollback action, backup path, marker, and operation action.
- `tools/generator/src/rollback/rollback-engine.ts` can list and show manifests.
- Verification command passed:
  - `NX_DAEMON=false pnpm nx test openforge --runInBand`

## Q001-P3-ROLLBACK

Evidence:

- `tools/generator/src/rollback/rollback-engine.ts` implements manifest-based rollback only, with dry-run default and write mode requiring `--yes`.
- Rollback refuses delete/restore when generated files changed after apply, lack markers, have missing backups, or fail hash verification.
- `tools/generator/src/rollback/rollback-engine.spec.ts` and the generated-module e2e cover rollback plans and write rollback behavior.
- Verification command passed:
  - `NX_DAEMON=false pnpm nx test openforge --runInBand`

## Q001-P3-API-GENERATOR

Evidence:

- `render-template-pack.ts` generates NestJS module/controller/service/dto/repository/spec skeletons with permission decorators and Swagger DTOs.
- App module registration is patch-plan only through `patch.app-module`; OpenForge does not directly mutate `apps/api/src/app/app.module.ts`.
- Verification commands passed:
  - `pnpm openforge:gate`
  - `NX_DAEMON=false pnpm nx test openforge --runInBand`

## Q001-P3-ADMIN-GENERATOR

Evidence:

- `default-template-pack.ts` and `render-template-pack.ts` generate Admin ProTable page, form, drawer, descriptions, export button, and smoke-test skeleton artifacts.
- Route and access registration are patch-plan only through `patch.admin-route` and `patch.admin-access`; OpenForge does not directly mutate Admin route/access files.
- Verification commands passed:
  - `pnpm openforge:gate`
  - `NX_DAEMON=false pnpm nx test openforge --runInBand`

## Q001-P3-SDK-TEST-DOCS

Evidence:

- The default template pack includes SDK client/types/spec/generated index, API/Admin tests, module/API/Admin docs, runbook, and patch-review artifacts.
- `tools/generator/src/e2e/generated-module.e2e.spec.ts` verifies generated SDK client and generated runbook files are created in a temp repo apply.
- Verification command passed:
  - `NX_DAEMON=false pnpm nx test openforge --runInBand`

## Q001-P3-DOCTOR-GATE-E2E

Evidence:

- Root scripts expose `openforge:doctor`, `openforge:gate`, and `openforge:test`.
- `tools/generator/src/doctor/openforge-doctor.ts` validates workspace, Nx project, contracts export, registry, OpenAPI snapshot, examples, default template pack, protected paths, and manifest directory status.
- `tools/generator/src/e2e/generated-module.e2e.spec.ts` covers plan, diff, write apply, idempotent apply, human-authored conflict blocking, and rollback in temp repos.
- Verification commands passed:
  - `pnpm openforge:doctor`
  - `pnpm openforge:gate`
  - `NX_DAEMON=false pnpm nx test openforge --runInBand`
  - `NX_DAEMON=false pnpm nx build openforge`

## Q001-P3-GOLDEN-SNAPSHOTS

Evidence:

- `tools/generator/src/render/render-template-pack.spec.ts` maintains golden snapshots for representative rendered template output.
- `tools/generator/src/__snapshots__/` snapshots passed after updating the stale OpenAPI tag reader assertion to the current granular registry tag `Core Dictionaries`.
- Verification command passed:
  - `NX_DAEMON=false pnpm nx test openforge --runInBand`

## Q001-P4-MESSAGE-REGISTRY

Evidence:

- `packages/module-registry/src/modules.ts` now registers `collaboration.message` with permissions, menu, Admin route, and `Collaboration Messages` API tag.
- `apps/admin/src/core/shellRegistry.ts`, `apps/admin/.umirc.ts`, and `apps/admin/src/access.ts` include the collaboration message route and permission.
- Verification commands passed:
  - `NX_DAEMON=false pnpm nx test module-registry --runInBand`
  - `pnpm registry:admin-routes:check`

## Q001-P4-MESSAGE-MODEL-API

Evidence:

- `prisma/schema.prisma` defines `CollaborationMessage`.
- `apps/api/src/modules/collaboration/collaboration` implements message DTOs, Prisma repository, seed repository, controller endpoints, and tests for unread/read/archive/delete behavior.
- `packages/sdk/src/collaboration-client.ts` and `collaboration-types.ts` expose message SDK methods and fixtures.
- `apps/admin/src/pages/Collaboration/Messages.tsx` adds the Admin page.
- Verification commands passed:
  - `NX_DAEMON=false pnpm nx test api --runInBand --testPathPatterns=collaboration`
  - `NX_DAEMON=false pnpm nx test sdk --runInBand`
  - `NX_DAEMON=false pnpm nx typecheck api`
  - `NX_DAEMON=false pnpm nx typecheck admin`

## Q001-P4-NOTICE

Evidence:

- `prisma/schema.prisma` defines `CollaborationNotice`.
- Notice API supports draft creation, publish, archive, target audience, and validity fields through `CollaborationController`.
- SDK fixtures/client and `apps/admin/src/pages/Collaboration/Notices.tsx` cover Admin/SDK surfaces.
- Verification commands passed:
  - `NX_DAEMON=false pnpm nx test api --runInBand --testPathPatterns=collaboration`
  - `NX_DAEMON=false pnpm nx test sdk --runInBand`

## Q001-P4-TODO

Evidence:

- `prisma/schema.prisma` defines `CollaborationTodo`.
- Todo API supports source type, business type/id, assign, complete, cancel, and timeline entries.
- SDK fixtures/client and `apps/admin/src/pages/Collaboration/Todos.tsx` cover Admin/SDK surfaces.
- Verification commands passed:
  - `NX_DAEMON=false pnpm nx test api --runInBand --testPathPatterns=collaboration`
  - `NX_DAEMON=false pnpm nx test sdk --runInBand`

## Q001-P4-APPROVAL-LITE

Evidence:

- `prisma/schema.prisma` defines `CollaborationApprovalLite`.
- Approval Lite API supports single-step submit, approve, and reject with pending-state enforcement and timeline tracking; it does not implement BPMN.
- SDK fixtures/client and `apps/admin/src/pages/Collaboration/Approvals.tsx` cover Admin/SDK surfaces.
- Verification command passed:
  - `NX_DAEMON=false pnpm nx test api --runInBand --testPathPatterns=collaboration`

## Q001-P4-COLLAB-AUDIT

Evidence:

- All collaboration writes are `POST`, `PATCH`, or `DELETE` endpoints handled by the global `AuditLogInterceptor`.
- `collaboration.permission-matrix.spec.ts` verifies write endpoints are protected by collaboration create/update/delete permission codes.
- Message, todo, and approval state transitions record status/timeline data in repositories.
- Verification commands passed:
  - `NX_DAEMON=false pnpm nx test api --runInBand --testPathPatterns=collaboration`
  - `NX_DAEMON=false pnpm nx test api --runInBand --testPathPatterns=audit-log`

## Q001-P4-COLLAB-E2E

Evidence:

- API repository and permission-matrix tests cover message/todo/approval-lite behavior.
- `packages/sdk/src/collaboration-client.spec.ts` locks representative SDK paths.
- `pnpm --dir apps/admin test` verifies Admin smoke and typecheck for collaboration pages.
- Verification commands passed:
  - `NX_DAEMON=false pnpm nx test api --runInBand --testPathPatterns=collaboration`
  - `NX_DAEMON=false pnpm nx test sdk --runInBand`
  - `pnpm --dir apps/admin test`

## Q001-P5-JOB-REGISTRY

Evidence:

- `packages/module-registry/src/modules.ts` registers `monitor.job` with permissions, menu, Admin route, and `Monitor Jobs` API tag.
- Admin shell/access/route drift is clean for `/monitor/jobs`.
- Verification commands passed:
  - `NX_DAEMON=false pnpm nx test module-registry --runInBand`
  - `pnpm registry:admin-routes:check`

## Q001-P5-JOB-RUNTIME

Evidence:

- `prisma/schema.prisma` defines `JobDefinition` and `JobRunLog`.
- `apps/api/src/modules/monitor/operations` implements job definition CRUD subset, enable/disable, manual trigger, run logs, bounded retry/timeout policy, and BullMQ adapter metadata.
- `packages/sdk/src/operations-client.ts` and `apps/admin/src/pages/Monitor/Jobs.tsx` add SDK/Admin surfaces.
- Verification commands passed:
  - `NX_DAEMON=false pnpm nx test api --runInBand --testPathPatterns=operations`
  - `NX_DAEMON=false pnpm nx test sdk --runInBand`

## Q001-P5-CACHE

Evidence:

- `monitor.cache` registry entry, API endpoints, SDK client, and Admin page are implemented.
- Cache clear is prefix-only, dry-run by default, and requires `confirmed=true` for write mode.
- Verification command passed:
  - `NX_DAEMON=false pnpm nx test api --runInBand --testPathPatterns=operations`

## Q001-P5-ONLINE-USER

Evidence:

- `prisma/schema.prisma` defines `OnlineUserSession`.
- API supports session/token activity listing and permission-gated kick-out by setting `revokedAt`; global audit interceptor records the POST operation.
- SDK client and `apps/admin/src/pages/Monitor/OnlineUsers.tsx` are implemented.
- Verification commands passed:
  - `NX_DAEMON=false pnpm nx test api --runInBand --testPathPatterns=operations`
  - `NX_DAEMON=false pnpm nx typecheck admin`

## Q001-P5-REPORT-DESIGN

Evidence:

- `optional.report` registry entry and `ReportDefinition` Prisma model are implemented.
- API supports minimal report definitions with `querySchema`; no full report designer is implemented.
- SDK client and `apps/admin/src/pages/Optional/Reports.tsx` are implemented.
- Verification command passed:
  - `NX_DAEMON=false pnpm nx test api --runInBand --testPathPatterns=operations`

## Q001-P5-EXPORT-JOB-DESIGN

Evidence:

- `optional.export-job` registry entry, API design endpoint, SDK fixture, and Admin page are implemented.
- The design binds file asset id, job definition code, permission code, expiry timestamp, and audit log id without implementing large-data export execution.
- Verification commands passed:
  - `NX_DAEMON=false pnpm nx test api --runInBand --testPathPatterns=operations`
  - `NX_DAEMON=false pnpm nx test sdk --runInBand`

## Q001-P5-WORKFLOW-ADMISSION

Evidence:

- `docs/development/workflow-admission.md` documents workflow admission and explicitly bridges only Approval Lite for cycle 001.
- The collaboration Approval Lite implementation does not introduce BPMN or a process designer.

## Q001-P6-INTEGRATION-CORE

Evidence:

- `integration.provider` registry entry is implemented without admitting forbidden `integration.pay`.
- `prisma/schema.prisma` defines `IntegrationProvider`.
- Provider API enforces `secret://` references, redacts credential-like config keys, supports health check and enable/disable, and is covered by SDK/Admin/tests.
- Verification commands passed:
  - `NX_DAEMON=false pnpm nx test api --runInBand --testPathPatterns=integration`
  - `NX_DAEMON=false pnpm nx test sdk --runInBand`
  - `pnpm registry:admin-routes:check`

## Q001-P6-MAIL

Evidence:

- `integration.mail` registry entry, provider abstraction, templates, outbox, preview, retry metadata, permissions, SDK client, and Admin page are implemented.
- `IntegrationTemplate` and `IntegrationOutbox` Prisma models back templates and outbox records.
- Verification command passed:
  - `NX_DAEMON=false pnpm nx test api --runInBand --testPathPatterns=integration`

## Q001-P6-SMS

Evidence:

- `integration.sms` registry entry, templates, outbox, preview, permissions, SDK client, and Admin page are implemented.
- SMS enqueue enforces phone-like recipients and minimum verification-code length before queuing.
- Verification command passed:
  - `NX_DAEMON=false pnpm nx test api --runInBand --testPathPatterns=integration`

## Q001-P6-OAUTH

Evidence:

- `integration.oauth` registry entry and Admin page are implemented.
- API exposes OAuth provider listing and callback contract covering state TTL, state security, account binding, token secret references, and audit action.
- Verification commands passed:
  - `NX_DAEMON=false pnpm nx test api --runInBand --testPathPatterns=integration`
  - `NX_DAEMON=false pnpm nx typecheck admin`

## Q001-P6-WECHAT-DESIGN

Evidence:

- `docs/development/integration-wechat-design.md` documents the WeChat provider boundary and explicitly excludes full WeChat business workflows.
- API/SDK/Admin expose a design-only WeChat integration summary.

## Q001-P6-WEBSOCKET-DESIGN

Evidence:

- `docs/development/integration-websocket-design.md` documents auth, room, event, audit, and security boundaries.
- API/SDK/Admin expose a design-only WebSocket integration summary.

## Q001-P6-PAY-PROVIDER-DESIGN

Evidence:

- `docs/development/integration-payment-provider-design.md` documents mock/sandbox provider boundaries and blocks real payment until callback idempotency, refund, and reconciliation are complete.
- Registry uses `integration.billing-design`, not forbidden `integration.pay`, preserving the payment scope guard.
- API/SDK/Admin expose a design-only payment summary.
