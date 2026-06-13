# cycle-021 Reference Comparison

Date: 2026-06-13

Reference comparison is capability-based, not commit-count based. OpenCore
should translate stable enterprise admin foundations into its own API, SDK,
Admin, permission, seed, OpenAPI and smoke boundaries.

## Reference Heads

- RuoYi-Vue: `41720e624c5a668c7d3777835e4c87095a7a1dfd`
- Yudao backend: `51b3d2d8cddd9a2a48e1edc2a7267359f61264cb`
- Yudao Admin: `17428e98676c8a626f66da780c7c854c73d6089f`

## Rules

- Compare product capabilities and operator workflows, not raw commit volume.
- Keep OpenCore-native boundaries: package-owned runtime, typed SDK, Umi
  Admin, OpenAPI snapshots and smoke/deploy guards.
- A minimal loop is one deployable stage, not permission to leave the product
  thin forever.
- State admitted boundary and remaining debt once; do not repeat parity
  disclaimers every round.

## Coverage

- System/RBAC: menu, role, permission, user, dept, post, dict and config are
  live with multiple hardening stages.
- Auth/session: login policy, logout, force logout, online-user kick-out and
  token/session revocation are real behavior.
- Logs: login-log has schema, lockout, cleanup, actor/reason and location;
  operation-log has list/detail/export/delete/clean.
- Notice: management, inbox/read analytics, templates, delivery records, local
  provider, Integration outbox bridge, state sync, queued processing and signed
  callback intake are live.
- Config: runtime keys, login policy, feature flags, rollout, audience rules
  and secret-vault encryption are live.
- Monitor/OpenForge/Scheduler: foundations exist; deeper operator workflows
  remain P2.

## Recent Decisions

- Round 67: queue insertion is `pending`, not provider `sent`; retry and
  provider success/failure are explicit state transitions.
- Round 68: operation-log cleanup is a privileged maintenance action and the
  cleanup request itself remains audited.
- Round 69: provider execution is distinct from queue creation; processing
  enabled queued outbox rows moves notice delivery to `sent`.
- Round 70: provider callbacks are signed, ownership-checked and reuse the
  same sent/failed sync paths. Public anonymous webhooks wait for a general
  public-route policy.

## Explicit Non-Claims

Explicit user admission is still required for production multi-tenancy,
BPMN/full workflow, full report designer, real payment/refund/reconciliation,
CRM/ERP/MES/WMS/mall/member suites, real external notification provider fleet
and AI/RAG/Agent workflow.

## Next Focus

Choose one foundation stage from notice adapters/retry/realtime, config
governance, operation-log enrichment, scheduler/monitor depth, OpenForge Admin
or integration health/config audit.
