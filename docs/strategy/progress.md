# OpenCore Strategy Progress

更新时间：2026-06-29

This file is now a compact progress index. It must not be used as a per-round
execution transcript. Do not paste repeated command lists, smoke logs, changed
file lists, or deployment output here; keep those in commits, CI logs, smoke
scripts, deployment scripts, and the active quality-cycle handoff.

## Current Source Of Truth

| Topic                             | Source                                                           |
| --------------------------------- | ---------------------------------------------------------------- |
| Current tenant foundation handoff | `docs/quality-cycle/cycle-022/handoff.md`                        |
| Current tenant waterline and debt | `docs/quality-cycle/cycle-022/productization-waterline-audit.md` |
| Current tenant acceptance matrix  | `docs/quality-cycle/cycle-022/acceptance-matrix.md`              |
| Current tenant backlog            | `docs/quality-cycle/cycle-022/backlog.md`                        |
| Tenant architecture               | `docs/quality-cycle/cycle-022/tenant-architecture.md`            |
| Tenant threat model               | `docs/quality-cycle/cycle-022/threat-model.md`                   |
| Closed capstone handoff           | `docs/quality-cycle/cycle-021/handoff.md`                        |
| Historical backend extraction     | `docs/quality-cycle/cycle-020/completion-report.md`              |
| Profile center productization     | `docs/strategy/profile-center-productization.md`                 |

## Current Status

OpenCore has completed Cycle-022 SaaS tenant foundation V1. The project has
moved past strategy-only planning, S3-S8 foundation, runtime integration,
OpenForge V1, Admin Ant Design Pro V6 migration, backend package extraction,
the Cycle-021 seven-page System Admin fallback closure, and the Cycle-022
tenant identity/auth/data/runtime/Admin control-plane closure.

Cycle-022 has delivered a code-backed tenant security boundary for the current
OpenCore schema and module registry. This admits the platform tenant foundation
only; it does not admit CRM/ERP/Mall/AI/payment or other business domains.

Current state:

- Many API/SDK/Admin live-only local stages have shipped across system,
  security, monitor, integration, tools and collaboration foundations.
- Personal Profile Center is now a live four-tab account self-service surface:
  basic profile, security settings, account binding and login activity.
- System Roles Admin is now live-only for CRUD, menu/user assignment, status,
  data-scope dept selection and current-page export.
- System Users Admin is now live-only for CRUD, role assignment, status/batch
  mutations, reset password, department filtering, post/dept selectors,
  import/export and current-page export.
- System Config Admin is now live-only for CRUD, value reads, cache refresh,
  batch deletion, environment overrides, feature flag rollout/audience
  controls, secret/vault operations and exports.
- System Notices Admin is now live-only for management CRUD,
  publish/archive/delete, inbox read actions, template CRUD/render,
  read-user analytics, delivery records and outbox provider actions.
- System Files Admin is now live-only for list/detail, upload/download,
  metadata update, delete and current-page export.
- System Permissions Admin is now accepted as full `Meets` after
  closure-flow public API/Admin smoke confirmation.
- System Posts Admin is now accepted as full `Meets` after closure-flow public
  API/Admin smoke confirmation.
- A seven-page acceptance matrix now separates runtime completion from Admin
  live-only acceptance.
- A global no-fixture-fallback guard now protects all seven fixed System Admin
  closure rows through Admin smoke and deployment.
- Public API/Admin smoke is explicit for all seven fixed System Admin rows.
- Progress, handoff, ledger and completion-report docs are reconciled for the
  finite System Admin fallback closure.
- Tenant foundation V1 is complete: global users can have tenant memberships,
  bearer sessions are tenant-bound, tenant switching reissues tokens, platform
  visit is explicit and audited, tenant plan modules clip permissions/menus,
  core/system/collaboration/report data is tenant-scoped, runtime caches/files/
  queues/WebSocket/Integration records carry tenant context, and `/system/tenants`
  is a live Admin control plane.
- Business-domain admission is guarded: current Prisma/module-registry/OpenForge
  checks reject unadmitted CRM/ERP/Mall/AI/payment-style domains until a future
  tenant-owned domain plan exists.

Fixed deployment entrypoints:

- API: `http://144.217.243.161:39172`
- Admin: `http://144.217.243.161:39174`
- Deploy script: `pnpm deploy:opencore`
- Local smoke port: `39173`

Docs-only cleanup does not require redeploy. Code changes still require test,
commit, push, deployment through the fixed script, public API smoke and public
Admin smoke.

## Milestone Summary

| Area                    | State    | Compact record                                                                                                                                                                                          |
| ----------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Strategy blueprint      | Complete | Target vision, capability matrix, API architecture, Admin map, staged roadmap and offline visual were created.                                                                                          |
| S3-S8 foundation        | Complete | Contracts/shared/module-registry, API foundation, Admin shell, auth/RBAC, system management, monitor/tool baseline shipped.                                                                             |
| Runtime integration     | Complete | Legacy app runtime frozen; OpenCore received isolated PostgreSQL, Redis/BullMQ and MinIO/S3 boundaries plus live smoke.                                                                                 |
| OpenForge S9 MVP        | Complete | Registry entry, contracts, read-only plan/diff/check, safety preflight and docs landed.                                                                                                                 |
| OpenForge V1            | Complete | Schema/config DSL, template pack, safe apply, manifest rollback, doctor, gate, and generated API/Admin/SDK/docs skeletons landed.                                                                       |
| Admin V6 migration      | Complete | Admin moved to official Ant Design Pro V6 structure; official OpenCore pages, login/request, route registry and smoke guards were aligned.                                                              |
| Backend extraction BE20 | Complete | Runtime capabilities were extracted into `packages/*`; `apps/api` is now bootstrap, HTTP aggregation, config and OpenAPI export/check.                                                                  |
| Cycle-021               | Closed   | The finite System Admin fallback closure is complete; new large domains still require explicit admission.                                                                                               |
| Cycle-022               | Complete | SaaS tenant foundation V1 is complete across identity, auth, RBAC/menu clipping, data isolation, runtime propagation, Admin control plane, OpenAPI/SDK, smoke and guards.                               |
| System Area             | Complete | `system.area` upgrades the former area tool boundary into System Management master data with tree/query, AreaCascader, formatter, IP lookup and dataset governance; public API/Admin smoke is recorded. |

## Cycle-021 Compressed History

| Rounds | Focus                                                                                                                                                 |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1-13   | First live API/SDK/Admin stages for notice, dept, post, menu, role, permission, user, dict, config, file, login-log, operation-log and online-user.   |
| 14-23  | Online-user revocation, file content, menu metadata, role/user hardening, dict item boundaries, config category/public/secret preparation.            |
| 24-36  | Config cache/value/runtime, option sources, profile/password/avatar, scheduler lifecycle and monitor details.                                         |
| 37-49  | Config export/batch/runtime, login-log schema/lockout/cleanup, operation-log filter/detail/export and online-user location/device/session fields.     |
| 50-59  | Logout audit semantics, dept/post ordering, data-scope, notice publish flow, scheduler controls, monitor runtime/queue details.                       |
| 60-115 | Notice provider/outbox reliability, config vault/KMS, monitor/jobs/cache/version, OpenForge, integration/collaboration and Admin live-only hardening. |

See `docs/quality-cycle/cycle-021/round-history.md` for the maintained version.

## Guardrails Learned The Hard Way

- Do not treat a minimal stage as a minimal product. A stage must be deployable,
  verifiable and reversible; a product area can take multiple consecutive rounds
  until it reaches productization waterline.
- Do not re-decide ports. API/Admin/local smoke ports are fixed in scripts.
- Do not hand-fix repeated deployment problems. `/api/api`, stale Admin bundle,
  retired service worker, frontend cache and deploy-marker checks belong in
  scripts/smokes.
- Do not let queued notification outbox mean provider-sent. Queue creation,
  provider execution, callbacks and retry scheduling are separate states.
- Do not run Admin `typecheck` and `lint` concurrently when generated types are
  involved; previous generated-type races made this unsafe.
- Do not paste standard command transcripts into progress docs. Record only new
  product facts, new guardrails, new debt, or a changed source-of-truth link.

## Active Productization Queue

No in-scope Cycle-022 tenant-foundation item remains. This file must not be
used to select another queue.

Large domains such as CRM/ERP/Mall/member modules, payment, production SaaS
commercial operations, BPM, AI and report designer still require explicit
tenant-owned admission before implementation.

## Documentation Hygiene Rule

Future updates to this file should be rare and small. If a paragraph does not
change the current state, a guardrail, a productization boundary, or a
source-of-truth link, it does not belong here.
