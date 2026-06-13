# cycle-020 Backend Self-Loop Backlog

Source prompt: `docs/quality-cycle/opencore-backend-self-loop.md`

Cycle-020 is complete. This backlog now keeps only the dependency order and
durable acceptance state; repeated per-package lint/typecheck/test gate lines
were removed.

## Dependency Order

| Item     | Status | Boundary                                                     |
| -------- | ------ | ------------------------------------------------------------ |
| BE20-P01 | Done   | `@opencore/common` framework-neutral primitives.             |
| BE20-P02 | Done   | `@opencore/core` NestJS platform foundation.                 |
| BE20-P03 | Done   | `@opencore/database` Prisma module, transactions and seeds.  |
| BE20-P04 | Done   | `@opencore/redis` Redis/BullMQ connection and cache helpers. |
| BE20-P05 | Done   | `@opencore/file` local/MinIO/S3 storage abstraction.         |
| BE20-P06 | Done   | `@opencore/system` dictionary boundary.                      |
| BE20-P07 | Done   | `@opencore/system` config boundary with secret redaction.    |
| BE20-P08 | Done   | `@opencore/system` notice boundary.                          |
| BE20-P09 | Done   | `@opencore/system` department boundary.                      |
| BE20-P10 | Done   | `@opencore/system` post boundary.                            |
| BE20-P11 | Done   | `@opencore/system` menu boundary.                            |
| BE20-P12 | Done   | `@opencore/system` role boundary.                            |
| BE20-P13 | Done   | `@opencore/system` user boundary.                            |
| BE20-P14 | Done   | `@opencore/security` auth/JWT/password/captcha boundary.     |
| BE20-P15 | Done   | `@opencore/security` RBAC guard/decorator boundary.          |
| BE20-P16 | Done   | `@opencore/security` data-scope policy boundary.             |
| BE20-P17 | Done   | `@opencore/audit` login log boundary.                        |
| BE20-P18 | Done   | `@opencore/audit` operation log boundary.                    |
| BE20-P19 | Done   | `@opencore/online-user` session runtime boundary.            |
| BE20-P20 | Done   | `@opencore/scheduler` scheduler runtime boundary.            |
| BE20-P21 | Done   | `@opencore/monitor` monitor runtime boundary.                |
| BE20-P22 | Done   | `@opencore/generator-core` OpenForge core boundary.          |
| BE20-P23 | Done   | `tools/generator` OpenForge CLI wrapper alignment.           |
| BE20-P24 | Done   | `apps/api` bootstrap/module aggregation cleanup.             |

## Acceptance Kept

- Each package boundary is recognized by Nx and TypeScript path aliases where
  applicable.
- API-local ownership was removed or reduced to HTTP aggregation, runtime
  config and OpenAPI app wiring.
- Package tests cover the moved runtime behavior; full backend gate passed for
  the cycle.
- Scheduler uses an explicit registry whitelist; OpenForge keeps dry-run,
  protected-path, generated-marker and manifest rollback safety.
- Secret redaction, data-scope, audit logging, online-user revocation and
  monitor diagnostics stayed behavior-preserving through the extraction.

## Out Of Scope

Cycle-020 did not admit CRM, ERP, MES, WMS, mall, member, production payments,
BPMN workflow, full report designer, AI/RAG/Agent execution or unrestricted
OpenForge writes.

## Handoff

Cycle-021 owns the next layer: capability-map productization over the extracted
foundation.
