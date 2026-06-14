# OpenCore Strategy Progress

更新时间：2026-06-14

This file is now a compact progress index. It must not be used as a per-round
execution transcript. Do not paste repeated command lists, smoke logs, changed
file lists, or deployment output here; keep those in commits, CI logs, smoke
scripts, deployment scripts, and the active quality-cycle handoff.

## Current Source Of Truth

| Topic                          | Source                                                           |
| ------------------------------ | ---------------------------------------------------------------- |
| Active capstone handoff        | `docs/quality-cycle/cycle-021/handoff.md`                        |
| Current waterline and debt     | `docs/quality-cycle/cycle-021/productization-waterline-audit.md` |
| Acceptance matrix              | `docs/quality-cycle/cycle-021/acceptance-matrix.md`              |
| Active backlog                 | `docs/quality-cycle/cycle-021/backlog.md`                        |
| Guard and implementation facts | `docs/quality-cycle/cycle-021/implementation-notes.md`           |
| Round history                  | `docs/quality-cycle/cycle-021/round-history.md`                  |
| Reference comparison           | `docs/quality-cycle/cycle-021/reference-comparison.md`           |
| Historical backend extraction  | `docs/quality-cycle/cycle-020/completion-report.md`              |

## Current Status

OpenCore is in Cycle-021 capability-map productization. The project has moved
past strategy-only planning, S3-S8 foundation, runtime integration, OpenForge
V1, Admin Ant Design Pro V6 migration, and backend package extraction.

Cycle-021 has delivered 123 deployable stages, but remains in System Admin
Fallback Closure until the seven-page acceptance matrix, live-only guard,
public smoke and doc reconciliation are complete.

Current state:

- Many API/SDK/Admin live-only local stages have shipped across system,
  security, monitor, integration, tools and collaboration foundations.
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
- A seven-page acceptance matrix now separates runtime completion from Admin
  live-only acceptance.
- A global no-fixture-fallback guard is still required.
- Public smoke coverage must be explicit before any capability is marked full
  `Meets`.
- Progress, handoff, ledger and completion-report docs still need one final
  reconciliation pass.

Fixed deployment entrypoints:

- API: `http://144.217.243.161:39172`
- Admin: `http://144.217.243.161:39174`
- Deploy script: `pnpm deploy:opencore`
- Local smoke port: `39173`

Docs-only cleanup does not require redeploy. Code changes still require test,
commit, push, deployment through the fixed script, public API smoke and public
Admin smoke.

## Milestone Summary

| Area                    | State    | Compact record                                                                                                                             |
| ----------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Strategy blueprint      | Complete | Target vision, capability matrix, API architecture, Admin map, staged roadmap and offline visual were created.                             |
| S3-S8 foundation        | Complete | Contracts/shared/module-registry, API foundation, Admin shell, auth/RBAC, system management, monitor/tool baseline shipped.                |
| Runtime integration     | Complete | Legacy app runtime frozen; OpenCore received isolated PostgreSQL, Redis/BullMQ and MinIO/S3 boundaries plus live smoke.                    |
| OpenForge S9 MVP        | Complete | Registry entry, contracts, read-only plan/diff/check, safety preflight and docs landed.                                                    |
| OpenForge V1            | Complete | Schema/config DSL, template pack, safe apply, manifest rollback, doctor, gate, and generated API/Admin/SDK/docs skeletons landed.          |
| Admin V6 migration      | Complete | Admin moved to official Ant Design Pro V6 structure; official OpenCore pages, login/request, route registry and smoke guards were aligned. |
| Backend extraction BE20 | Complete | Runtime capabilities were extracted into `packages/*`; `apps/api` is now bootstrap, HTTP aggregation, config and OpenAPI export/check.     |
| Cycle-021               | Active   | Core/system/security/monitor/integration foundations are in finite Capstone Acceptance & Debt Closure.                                     |

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

Current foundation queue from Cycle-021:

- Build and keep the acceptance matrix current.
- Add a global no-fixture-fallback guard.
- Confirm or close System Posts local-only row against the strict matrix,
  public smoke and global guard.
- Add explicit public smoke before marking capabilities as full `Meets`.
- Reconcile progress, handoff, ledger and completion-report docs.

Large domains such as business modules, payment, multitenancy, BPM, AI and
report designer still require explicit admission before implementation.

## Documentation Hygiene Rule

Future updates to this file should be rare and small. If a paragraph does not
change the current state, a guardrail, a productization boundary, or a
source-of-truth link, it does not belong here.
