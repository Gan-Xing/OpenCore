# OpenCore Quality Cycle 001 Audit

Cycle: 001
London time at cycle start: 2026-06-11 00:24:43 Europe/London
Scope: phases 1-6, with explicit guardrails against importing industry packages into core.

## Current OpenCore State

OpenCore is an Nx/pnpm monorepo with:

- API: `apps/api`, NestJS modules under `apps/api/src/modules`.
- Admin: `apps/admin`, Umi/Ant Design routes in `apps/admin/.umirc.ts`.
- Contracts: `packages/contracts`.
- SDK: `packages/sdk`.
- Module registry: `packages/module-registry`.
- OpenForge: `tools/generator`.
- Runtime persistence: Prisma schema and seed in `prisma`.

Current git status for cycle inputs shows the handoff, quality-cycle docs, counter state, and quality-cycle tool as untracked. These are treated as current authoritative worktree state and are not reverted.

## Phase 1: Platform Core

Implemented evidence:

- `packages/module-registry/src/modules.ts` defines stable permission codes for users, roles, permissions, menus, dicts, config, files, audit logs, login logs, monitor, OpenAPI, OpenForge, and export tools.
- `prisma/schema.prisma` contains `User`, `Role`, `Permission`, `Menu`, `UserRole`, `RolePermission`, `DictType`, `DictItem`, `SystemConfig`, `FileAsset`, `AuditLog`, and `LoginLog`.
- `apps/api/src/modules/core/rbac/auth.service.ts` validates bearer tokens on every guarded request and rejects disabled or missing users through `toAuthenticatedUser`.
- `apps/api/src/modules/core/rbac/permission.guard.ts` enforces `@RequirePermission` metadata.
- `apps/api/src/modules/core/system-management/system-management.controller.ts` exposes CRUD/export style endpoints for dicts, config, files, audit logs, and login logs.
- `apps/api/src/modules/monitor/monitoring/runtime-diagnostics.service.ts` checks DB, Redis, BullMQ queue state, and S3 with redacted failure messages.
- `apps/api/src/platform/request-context/request-context.middleware.ts` emits `x-request-id` and `x-trace-id`.

Gaps found:

- `apps/api/src/modules/core/rbac/rbac.controller.ts` only has list endpoints for users, roles, permissions, and menus, while the registry already defines create/update/delete/export permissions.
- `apps/api/src/modules/core/rbac/auth.service.ts` returns `expiresInSeconds: 3600` but the token payload has no `exp`, so expiry is not enforced.
- Login logs exist in Prisma/seed/system-management reads, but login success/failure is not automatically written by auth runtime.
- Audit logs exist in Prisma/seed/system-management reads, but no global write interceptor records successful/failed write operations.
- `SystemConfig` only has a boolean `public`; it does not distinguish public/private/secret classes, and secret values are blocked by key validation rather than represented safely.
- File assets support create/delete/export but do not support metadata update.

## Phase 2: Contract System

Implemented evidence:

- `packages/contracts/src/openapi-contract.ts` defines the OpenAPI snapshot, export, drift check, and SDK package protocol.
- `packages/contracts/src/table-export-contract.ts` defines bounded current-page export.
- `packages/contracts/src/openforge-contract.ts` contains OpenForge marker, apply, manifest, rollback, and patch plan contracts.
- `packages/module-registry/src/registry.ts` validates duplicate module codes, permission codes, menu keys, menu permission links, and forbidden S3-S8 module prefixes.
- `apps/api/src/platform/openapi/check-openapi-drift.ts` compares the generated API document to `packages/contracts/openapi/opencore-api.json`.

Gaps found:

- Root `package.json` exposes `openapi:export` and `openapi:check`, but not `sdk:generate`, even though `OPENAPI_CONTRACT_PROTOCOL.sdkGenerateCommand` names it.
- There is no registry-to-OpenAPI tag drift script yet.
- There is no registry-to-Admin route/access drift script yet.
- Permission deprecation and migration policy is not documented.
- Pagination exists as `PageQueryDto` in system management, but cross-package API/SDK/Admin contract helpers are not unified.
- Error response contract is largely runtime behavior, not a shared contract tested across API/SDK/Admin.

## Phase 3: OpenForge

Implemented evidence:

- `tools/generator/src` contains CLI, config, validators, template pack, VFS/apply, manifest, rollback, doctor, and e2e/golden tests.
- `tools/generator/examples/core.dict.v1.schema.json` exercises V1 schema/config DSL fields, relations, list, filter, form, detail, actions, permissions, OpenAPI, Admin, SDK, tests, docs, export, audit, and Prisma draft paths.
- Root scripts expose `openforge:check`, `openforge:apply`, `openforge:diff`, `openforge:doctor`, `openforge:manifest`, `openforge:plan`, `openforge:rollback`, `openforge:test`, and `openforge:gate`.
- `docs/development/openforge-v1-architecture.md`, `openforge-schema-authoring.md`, `openforge-template-authoring.md`, and `openforge-apply-rollback-runbook.md` document the safety model.

Gaps found:

- OpenForge appears substantially V1-complete, but cycle 001 still needs gates rerun against current state after any code changes.
- Generated outputs must continue to avoid direct Prisma schema/migration writes and direct human-authored route/module mutations.

## Phase 4: Collaboration

Implemented evidence:

- No first-party collaboration runtime module is currently imported by `apps/api/src/app/app.module.ts`.
- No Admin routes exist for message, notice, todo, or approval-lite in `apps/admin/.umirc.ts`.
- No SDK clients exist for collaboration in `packages/sdk/src`.

Gaps found:

- Need `collaboration.message`, `collaboration.notice`, `collaboration.todo`, and `collaboration.approval-lite` registry entries, permissions, API, SDK, Admin views, and tests.
- Scope must stay single-step approval-lite only; no BPMN/process designer in cycle 001.

## Phase 5: Workflow / Report / Job

Implemented evidence:

- Monitor status, version, and queue read-only endpoints exist under `apps/api/src/modules/monitor/monitoring`.
- `tool.export` is registered as a bounded current-page export protocol.

Gaps found:

- No job definition/run-log/manual-trigger runtime.
- No cache read-only prefix listing or protected clear policy.
- No online-user/session activity view.
- No optional report definition/query schema.
- No async export job design tying file/job/permission/expiry/audit together.
- No workflow admission document bridging approval-lite without BPMN.

## Phase 6: Integration

Implemented evidence:

- Runtime diagnostics read DB, Redis, BullMQ, and S3 configuration, but there is no integration provider registry/runtime.

Gaps found:

- Need integration provider registry/config/secret reference/redaction/health/audit/enable-disable boundary.
- Need mail and SMS provider abstractions with template/outbox/send log/retry safety.
- Need OAuth provider config/callback/state/account-binding design/runtime boundary.
- Need WeChat, WebSocket, and payment provider designs only, without real production payment/WeChat closure.

## Cycle 001 Implementation Order

1. Close audit/reference evidence and keep backlog accounting accurate.
2. Finish Phase 1 platform gaps that existing registry/schema already require: RBAC CRUD/export, auth expiry/login logging, audit interceptor, config secret class/redaction, file metadata update, and request/trace consistency tests.
3. Finish Phase 2 contract drift/policy gaps: `sdk:generate`, registry API tag drift, Admin route/access drift, permission deprecation policy, pagination/error/export-upload contracts.
4. Re-run and harden Phase 3 OpenForge gates only after platform/contract changes.
5. Add Phase 4 collaboration as bounded first-party collaboration modules, not industry packages.
6. Add Phase 5 job/cache/online-user/report/workflow admission boundaries without building full BPMN/report-designer/big-data export.
7. Add Phase 6 integration provider/mail/SMS/OAuth runtime boundaries and WeChat/WebSocket/pay design docs without real provider closures.
8. Update docs, completion report, and run the full gate before `complete-cycle`.

## Scope Guard

- No `.env.opencore.local` was read.
- Reference repos were cloned under `/tmp/opencore-quality-refs` for inspection only.
- No Java/Vue/old NestWeb/Antdpro6 business code is copied.
- CRM/ERP/MES/WMS/mall/pay/member/multi-tenant/AI/RAG/Agent remain outside core runtime.
