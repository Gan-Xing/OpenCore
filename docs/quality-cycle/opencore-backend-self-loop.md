# OpenCore Backend Self-Loop Archive

Status: completed on 2026-06-12.

The backend self-loop execution prompt is archived. BE20-P01 through BE20-P24
are checked in `docs/quality-cycle/cycle-020/backlog.md`, implementation
evidence is in `docs/quality-cycle/cycle-020/implementation-notes.md`, and the
final summary is in `docs/quality-cycle/cycle-020/completion-report.md`.

## Completed Scope

The run translated the useful RuoYi/Yudao backend foundation into OpenCore's
TypeScript/NestJS monorepo structure:

- `apps/api` stays a composition root for bootstrap, HTTP aggregation, runtime
  config and OpenAPI export/check.
- Shared backend primitives live in packages for common contracts, core NestJS
  infrastructure, database, Redis, file storage, system, security, audit,
  online-user, scheduler, monitor and generator-core.
- OpenForge stays a guarded generator path with plan, diff, check, safe apply,
  manifest and rollback boundaries.

## Durable Decisions

- Do not copy Java/Spring/MyBatis/Quartz implementation shapes when a
  TypeScript/NestJS/Prisma/BullMQ pattern is cleaner.
- Scheduler execution must use an explicit registry whitelist, not unrestricted
  reflective method invocation.
- Business domains such as CRM, ERP, MES, WMS, mall, member, tenant, payment
  and AI workflows remain separate admission decisions.
- Repeated failures belong in tests, smoke checks, deploy guards or concise
  handoff rules, not in repeated command transcripts.

Current recursive productization work continues from
`docs/quality-cycle/cycle-021/handoff.md`.
