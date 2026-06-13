# cycle-020 Backend Self-Loop Implementation Notes

Started: 2026-06-11 18:07:24 UTC

This file is the compact record for cycle-020. The original per-module command
transcripts and repeated "passed" blocks were removed because they duplicated
the same gate evidence across every package. Keep only durable boundaries,
decisions and incidents here; use `docs/quality-cycle/ledger.md` for completion
markers.

## Purpose

Cycle-020 moved OpenCore backend ownership from `apps/api` platform code into
reusable package boundaries, in lower-dependency order. The target was the
stable backend platform waterline from RuoYi/Yudao, translated into the
TypeScript/NestJS monorepo rather than copied from Java/Spring/MyBatis.

## Package Boundary Index

| Stage    | Boundary                        | Durable Result                                                                                                             |
| -------- | ------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| BE20-P01 | `@opencore/common`              | Framework-neutral constants, guards, error codes, response contracts, pagination, sorting and bounded filters.             |
| BE20-P02 | `@opencore/core`                | Nest request context, error filter, security baseline, logger, OpenAPI helpers and optional response envelope interceptor. |
| BE20-P03 | `@opencore/database`            | Prisma service/module, transaction helper, seed runner and local env loading for direct package tests.                     |
| BE20-P04 | `@opencore/redis`               | Redis client abstraction, key naming, TTL policy, JSON cache helpers and BullMQ connection options.                        |
| BE20-P05 | `@opencore/file`                | Local/MinIO/S3 storage ports, safe object keys, file validation and S3 prefix probes.                                      |
| BE20-P06 | `@opencore/system` dict         | Dictionary DTOs, records, repositories, service/module and export preview moved into package ownership.                    |
| BE20-P07 | `@opencore/system` config       | Config DTOs, repositories, service/module, secret-key guard, redaction and export preview moved into package ownership.    |
| BE20-P08 | `@opencore/system` notice       | Dedicated system notice model/runtime with publish/archive lifecycle and schedule guards.                                  |
| BE20-P09 | `@opencore/system` dept         | Department tree runtime, seed/Prisma repositories, service/module and delete guards.                                       |
| BE20-P10 | `@opencore/system` post         | Post runtime, ordering and enabled-list contracts.                                                                         |
| BE20-P11 | `@opencore/system` menu         | Menu runtime, tree metadata and permission-code traceability.                                                              |
| BE20-P12 | `@opencore/system` role         | Role runtime, role-menu and user-role relation support.                                                                    |
| BE20-P13 | `@opencore/system` user         | User runtime, password hashing bridge, auth-facing reads and status/session semantics.                                     |
| BE20-P14 | `@opencore/security` auth       | Auth/JWT/password/captcha boundaries and application auth wiring.                                                          |
| BE20-P15 | `@opencore/security` RBAC       | Permission guard/decorator/module ownership moved out of API-local files.                                                  |
| BE20-P16 | `@opencore/security` data scope | Data-scope decorator, policy and repository query enforcement.                                                             |
| BE20-P17 | `@opencore/audit` login log     | Login log DTOs, repositories, service/module and OpenAPI contracts.                                                        |
| BE20-P18 | `@opencore/audit` operation log | Operation log decorator/interceptor/runtime ownership moved into audit package.                                            |
| BE20-P19 | `@opencore/online-user`         | Online session runtime, revocation and kick-out audit context.                                                             |
| BE20-P20 | `@opencore/scheduler`           | Job definitions, run logs, BullMQ metadata and explicit registry whitelist.                                                |
| BE20-P21 | `@opencore/monitor`             | Status, version, queue and runtime diagnostics package boundary.                                                           |
| BE20-P22 | `@opencore/generator-core`      | OpenForge schema/config, planning, diff, render, VFS, safe apply, manifest, rollback and doctor core.                      |
| BE20-P23 | `tools/generator`               | CLI wrapper aligned to generator-core commands.                                                                            |
| BE20-P24 | `apps/api` aggregation          | API reduced to bootstrap, HTTP entry, module aggregation, runtime config and OpenAPI export/check.                         |

## Decisions Kept

- `@opencore/common` stays framework-neutral; Nest-specific filters,
  decorators, interceptors and Swagger helpers live in `@opencore/core`.
- Success response wrapping was packaged but not globally enabled during this
  migration to avoid changing existing SDK/Admin response shapes mid-cycle.
- Scheduler execution uses an explicit registry whitelist instead of
  reflective arbitrary method invocation.
- OpenForge writes remain safe-by-default: dry-run first, protected paths
  blocked, generated-marker ownership required, manifest rollback available.
- Final API aggregation removed legacy platform compatibility shims after
  package imports were stable.

## Incidents Kept

- Direct Prisma tests lost local env loading after `PrismaService` moved; fixed
  by loading `.env.opencore.local` inside `@opencore/database` without printing
  secrets.
- Redis/file/system package lockfile refreshes triggered formatting drift; the
  durable guard is `format:check`, not another copied command list.
- Admin `max setup` can race when Admin `typecheck` and `lint` run in parallel;
  run those sequentially.
- OpenAPI drift appeared after DTO moves, as expected; export/check snapshots
  are the guard.
- Seed compilation depends on package entrypoints; records-only exports exist
  to avoid pulling runtime modules into seed paths.
- The first online-user migration attempt exposed an existing local migration
  precondition; rollback was recorded and the migration was made idempotent.

## Completion

Cycle-020 completed BE20-P01 through BE20-P24 and handed off to cycle-021 for
capability-map productization.
