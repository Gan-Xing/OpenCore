# cycle-021 Reference Comparison

Date: 2026-06-13

Reference comparison is capability-based, not commit-count based. RuoYi and
Yudao have years of history and many thousands of commits; OpenCore should not
try to replay their commits. The target is to translate the stable enterprise
后台能力 into OpenCore's TS/NestJS monorepo boundaries with API, SDK, Admin,
permissions, seeds, OpenAPI and smoke guards.

## Reference Heads

- RuoYi-Vue: `41720e624c5a668c7d3777835e4c87095a7a1dfd`
- Yudao backend: `cdb4204bf8cf214861f1ae6da4bd116190089fa0`
- Yudao Admin: `17428e98676c8a626f66da780c7c854c73d6089f`

## Comparison Rules

- Compare product capabilities and operator workflows, not raw commit volume.
- Treat RuoYi/Yudao as reference waterlines for common 后台 modules:
  system, auth, RBAC, logs, config, notice, monitor, scheduler and generator.
- Keep OpenCore-native boundaries: package-owned runtime, typed SDK, Umi Admin,
  OpenAPI snapshots and smoke/deploy guards.
- A minimal loop is one deployable stage. It is not permission to leave the
  whole product at a thin implementation forever.
- Do not repeatedly write "OpenCore does not claim full parity" in every round.
  State the actual admitted boundary and the remaining debt once.

## Current Foundation Coverage

- System/RBAC: menu, role, permission, user, department, post, dict and config
  have live API/SDK/Admin/smoke coverage and multiple hardening stages.
- Auth/session: login policy, logout, force logout, online user kick-out and
  token/session revocation are real runtime behavior, not only audit rows.
- Logs: login-log has type/result, lockout, cleanup, actor/reason and
  deterministic location enrichment. Operation-log list/detail/export plus
  cleanup maintenance are live; retention scheduling and deeper enrichment
  remain.
- Notice: management, inbox read state, read-user analytics, templates,
  delivery records, local provider execution, Integration outbox bridge and
  outbox status synchronization plus queued provider processing are live.
- Config: runtime keys, login policy, feature flags, rollout percentage,
  audience rules and secret-vault encryption are live.
- Monitor/OpenForge/Scheduler: foundations exist, but deeper operator workflows
  remain P2 foundation work.

## Round 67 Reference Decision

RuoYi/Yudao-style notification delivery cannot treat queue insertion as a
successful provider send. Round 67 fixes OpenCore's state model:

- Queue handoff is `pending`.
- Provider failure is `failed` with a required reason.
- Retry moves the outbox and delivery state back to `pending`.
- Provider success is explicit `sent`.
- Already handed-off deliveries are not duplicated by repeat execute.

This is the correct foundation before connecting real SMTP/SMS providers or
callback/webhook execution.

## Round 68 Reference Decision

RuoYi/Yudao both expose operation-log cleanup/删除 as a privileged maintenance
action. OpenCore now matches that foundation without weakening audit
visibility:

- cleanup is protected by `core:audit-log:delete`;
- batch delete has empty, duplicate and missing-ID guards;
- clean-all reports affected rows;
- the cleanup request itself is still audited by the global interceptor.

## Round 69 Reference Decision

RuoYi/Yudao notification depth assumes provider execution is a distinct step
after queue creation. OpenCore now has that boundary:

- dispatch creates delivery records;
- execute creates external outbox rows without claiming provider success;
- process moves enabled provider queued rows to `sent`;
- notice delivery state is synchronized from the processed outbox row.

Signed callbacks, real SMTP/SMS adapters, retry scheduling and realtime push
remain separate notice reliability stages.

## Explicit Non-Claims

OpenCore does not yet claim full RuoYi/Yudao parity for:

- production multi-tenancy,
- BPMN/full workflow platform,
- full report designer,
- real payment/refund/reconciliation,
- CRM/ERP/MES/WMS/mall/member business suites,
- real external notification provider fleet and signed callbacks,
- AI/RAG/Agent workflow.

Those domains require explicit admission. P0/P1 foundation capabilities do not.

## Next Comparison Focus

Use the next comparison to choose one foundation stage from the remaining
queue: notice callbacks/adapters/realtime, config rollout governance, operation-log
enrichment, scheduler/monitor operation depth, OpenForge Admin or integration
health/config audit.
