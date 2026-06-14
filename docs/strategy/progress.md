# OpenCore Strategy Progress

更新时间：2026-06-14

This file is now a compact progress index. It must not be used as a per-round
execution transcript. Do not paste repeated command lists, smoke logs, changed
file lists, or deployment output here; keep those in commits, CI logs, smoke
scripts, deployment scripts, and the active quality-cycle handoff.

## Current Source Of Truth

| Topic                          | Source                                                           |
| ------------------------------ | ---------------------------------------------------------------- |
| Active productization loop     | `docs/quality-cycle/cycle-021/handoff.md`                        |
| Current waterline and debt     | `docs/quality-cycle/cycle-021/productization-waterline-audit.md` |
| Active backlog                 | `docs/quality-cycle/cycle-021/backlog.md`                        |
| Guard and implementation facts | `docs/quality-cycle/cycle-021/implementation-notes.md`           |
| Round history                  | `docs/quality-cycle/cycle-021/round-history.md`                  |
| Reference comparison           | `docs/quality-cycle/cycle-021/reference-comparison.md`           |
| Historical backend self-loop   | `docs/quality-cycle/cycle-020/completion-report.md`              |

## Current Status

OpenCore is in Cycle-021 capability-map productization. The project has moved
past strategy-only planning, S3-S8 foundation, runtime integration, OpenForge
V1, Admin Ant Design Pro V6 migration, and backend self-loop package extraction.

Cycle-021 has completed 118 deployable stages as of the current handoff. The
active queue remains foundation-level backend/admin capability hardening, not
large business-domain admission.

Fixed deployment entrypoints:

- API: `http://144.217.243.161:39172`
- Admin: `http://144.217.243.161:39174`
- Deploy script: `pnpm deploy:opencore`
- Local smoke port: `39173`

Docs-only cleanup does not require redeploy. Code changes still require test,
commit, push, deploy, and public URL verification through the fixed script.

## Milestone Summary

| Area                   | State    | Compact record                                                                                                                             |
| ---------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Strategy blueprint     | Complete | Target vision, capability matrix, API architecture, Admin map, staged roadmap and offline visual were created.                             |
| S3-S8 foundation       | Complete | Contracts/shared/module-registry, API foundation, Admin shell, auth/RBAC, system management, monitor/tool baseline shipped.                |
| Runtime integration    | Complete | Legacy app runtime frozen; OpenCore received isolated PostgreSQL, Redis/BullMQ and MinIO/S3 boundaries plus live smoke.                    |
| OpenForge S9 MVP       | Complete | Registry entry, contracts, read-only plan/diff/check, safety preflight and docs landed.                                                    |
| OpenForge V1           | Complete | Schema/config DSL, template pack, safe apply, manifest rollback, doctor, gate, and generated API/Admin/SDK/docs skeletons landed.          |
| Admin V6 migration     | Complete | Admin moved to official Ant Design Pro V6 structure; official OpenCore pages, login/request, route registry and smoke guards were aligned. |
| Backend self-loop BE20 | Complete | Runtime capabilities were extracted into `packages/*`; `apps/api` is now bootstrap, HTTP aggregation, config and OpenAPI export/check.     |
| Cycle-021              | Active   | Core/system/security/monitor/integration foundations are being productized one deployable loop at a time.                                  |

## Cycle-021 Compressed History

| Rounds | Focus                                                                                                                                              |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1-13   | First live API/SDK/Admin loops for notice, dept, post, menu, role, permission, user, dict, config, file, login-log, operation-log and online-user. |
| 14-23  | Online-user revocation, file content, menu metadata, role/user hardening, dict item boundaries, config category/public/secret preparation.         |
| 24-36  | Config cache/value/runtime, option sources, profile/password/avatar, scheduler lifecycle and monitor details.                                      |
| 37-49  | Config export/batch/runtime, login-log schema/lockout/cleanup, operation-log filter/detail/export and online-user location/device/session fields.  |
| 50-59  | Logout audit semantics, dept/post ordering, data-scope, notice publish flow, scheduler controls, monitor runtime/queue details.                    |
| 60-118 | Notice provider/outbox reliability, config vault/KMS, monitor/jobs/cache/version, OpenForge, integration/collaboration and Admin live-only hardening. |

See `docs/quality-cycle/cycle-021/round-history.md` for the maintained version.

## Guardrails Learned The Hard Way

- Do not treat "minimal loop" as "minimal product". A round must be deployable,
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

- Admin live-only closure: System Roles, Users, Config, Files and System
  Notices still have fixture fallback and must fail visibly instead.
- Config governance: continue only where it adds runtime governance or removes
  Admin fallback debt; environment, KMS and key rotation foundations are live.
- After the remaining Admin fallback pages are closed, select the next
  admitted P0/P1 foundation gap from the active cycle handoff.

Large domains such as business modules, payment, multitenancy, BPM, AI and
report designer still require explicit admission before implementation.

## Documentation Hygiene Rule

Future updates to this file should be rare and small. If a paragraph does not
change the current state, a guardrail, a productization boundary, or a
source-of-truth link, it does not belong here.
