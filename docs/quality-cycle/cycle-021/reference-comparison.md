# cycle-021 Reference Comparison

Date: 2026-06-14

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
- Auth/session: login policy, logout, force logout, online-user kick-out,
  token/session revocation, registered-token allowlist enforcement and expired
  cleanup are real behavior. Online Users Admin now uses live session
  list/detail/kick-out/cleanup data only and fails visibly instead of showing
  fixtures.
- Logs: login-log has schema, lockout, cleanup, actor/reason, location,
  structured IP/location provider lookup and external HTTP JSON GeoIP adapter;
  operation-log has
  list/detail/export/delete, duration/location enrichment, retention cleanup
  and scheduled retention job. Security log Admin pages now use live-only data,
  and operation logs expose server-side Admin filters.
- Notice: management, inbox/read analytics, templates, delivery records, local
  provider, Integration outbox bridge, state sync, queued processing and signed
  callback intake plus retry scheduling, SMS HTTP adapter, SMTP adapter and
  mail subject persistence, provider diagnostics, SMS HTTP secret injection and
  SMTP attachments plus explicit SMTP TLS policy and authenticated inbox
  realtime events are live.
- Integration: provider health/config audit is live with readiness totals,
  config-vault debt, outbox backlog, last failure and operator actions plus
  OAuth token inventory/summary/detail/revoke. The OAuth Admin page is
  live-only for list/detail/revoke and no longer masks API failures with
  fixture fallback. Mail/SMS template/outbox Admin operations are live across
  API/SDK/Admin/OpenAPI/smoke. WeChat and WebSocket design Admin pages now
  read live design endpoints instead of fixtures while staying design-only
  boundaries.
- Config: runtime keys, login policy, feature flags, rollout, audience rules,
  environment overrides, secret-vault encryption, secret version history,
  explicit rotation, env-bound keyring status, managed HTTP JSON KMS v3
  envelopes and vault key rotation are live.
- Monitor/OpenForge/Scheduler: Monitor Jobs has a live Admin operation surface,
  registry visibility, registered handler diagnostics, cron dispatch, worker
  claim, scheduler queue metrics, guarded queue pause/resume and terminal
  run-log retention cleanup; Monitor
  Status exposes live dependency checks plus CPU, memory, disk and process
  runtime resources; Monitor Cache has Redis-backed namespace/key operations
  with safe value preview and confirmed deletion;
  Monitor Version exposes live runtime/deployment metadata instead of fixtures;
  Tool OpenAPI exposes live drift snapshot metadata instead of fixtures; Tool
  Export exposes live protocol/preview row-cap behavior in Admin; OpenForge has
  a live safe planning/dry-run workbench with confirmation and manifest
  preview/detail.
- Collaboration: Messages have live summary/list/detail, create, mark-read,
  archive and delete operations across API/SDK/Admin with seed, smoke and
  deploy guards. Notices have live list/detail, create, publish and archive
  operations. Todos have live list/detail, create, assign, complete and cancel
  operations. Approval Lite has live list/detail, create, approve and reject
  operations. This meets the current collaboration live-operations waterline;
  BPMN/full workflow remains a separate explicit-admission domain.

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
- Round 71: retry scheduling is explicit and bounded; failed outbox rows only
  return to queue when provider/channel validation passes and retry caps allow
  it.
- Round 72: SMS HTTP delivery is bounded by endpoint allowlisting, safe request
  config and explicit non-2xx failure sync.
- Round 73: SMTP delivery uses config-vault password resolution and explicit
  SMTP success/failure state sync.
- Round 74: Monitor Jobs moved from fixture-only Admin display to live
  enable/disable/manual-trigger/run-log operations, and operations summary
  gained the missing report migration/seed guard.
- Round 75: Monitor Jobs trigger registered handlers, expose handler registry
  visibility and record retry/duration/failed run diagnostics.
- Round 76: Mail outbox subject is a first-class persisted field; SMTP sends
  that field and no longer infers subject from payload.
- Round 77: Provider diagnostics expose readiness, config-vault hints, outbox
  backlog, last failure and operator actions through API/SDK/Admin.
- Round 78: SMS HTTP providers inject config-vault secrets into auth headers,
  query parameters and JSON body fields; smoke verifies the resolved request
  shape without exposing the secret.
- Round 79: SMTP attachments are bounded, persisted on mail outbox rows and
  verified through received MIME payload smoke.
- Round 80: SMTP TLS policy is explicit through `tlsMode`; deprecated TLS
  booleans are rejected and STARTTLS-required behavior is smoke-guarded.
- Round 81: Notice inbox realtime is an authenticated SSE stream with snapshot
  and read/publish events; multi-instance fanout remains a deployment-topology
  upgrade, not a current single-node blocker.
- Round 82: Config environment overrides are first-class public-config records;
  runtime config and feature evaluation resolve `environment` with default
  fallback.
- Round 83: Secret config version history is first-class metadata; explicit
  rotation updates current encrypted value and records active/inactive
  versions without exposing secret material.
- Round 84: Config vault envelopes now carry key IDs, expose env keyring
  status and support vault-key rewrap for current and versioned secrets while
  preserving legacy unversioned envelope deserialization.
- Round 85: Operation logs record duration/location, filter/export enriched
  fields and use retentionDays cleanup backed by the
  `audit-log.retention-clean` scheduled job.
- Round 86: OpenForge Admin exposes the existing safe generator core through
  API/SDK/Admin for status, doctor, plan, diff, check, manifests and dry-run
  apply/rollback; write-enabled code generation remains a later explicit
  stage.
- Round 87: Integration Providers expose a global health/config audit that
  aggregates existing diagnostics, config-vault debt, outbox backlog and
  failure history into API/SDK/Admin and deploy smoke guards.
- Round 88: Scheduler/monitor dispatches due cron jobs into queued schedule
  runs, lets a worker claim and execute them, exposes queue metrics in Admin
  and guards the flow through OpenAPI/SDK/smoke/deploy checks.
- Round 89: OpenForge dry-run operations require confirmation, reject
  write-mode intent at the API boundary and expose manifest preview/detail
  through SDK/Admin and smoke/deploy guards.
- Round 90: IP/location is a shared offline provider contract with
  lookup/status API, SDK/Admin visibility, OpenAPI tag registration and
  login-log smoke/deploy guards.
- Round 91: Online-user sessions act as the bearer-token allowlist/blacklist;
  unknown, revoked and expired sessions are rejected, expired records can be
  cleaned through API/SDK/Admin and the flow is smoke/deploy guarded.
- Round 92: OAuth token management is a token-inventory and revoke lifecycle,
  not a full third-party OAuth flow; token material stays behind secret refs
  while operators can list, inspect and revoke records through API/SDK/Admin.
- Round 93: External GeoIP is config-driven through a generic HTTP JSON
  adapter, with endpoint host allowlisting, timeout bounds, non-public-IP
  no-send behavior and builtin offline fallback diagnostics.
- Round 94: Managed KMS is config-driven through a generic HTTP JSON adapter;
  secret values use v3 envelopes with local data-key encryption and remote
  data-key wrap/unwrap, so the KMS protocol does not receive business secret
  plaintext.
- Round 95: Monitor Cache is a real Redis operator surface, not fixtures:
  namespace/key listing, safe value preview redaction, dry-run prefix clear and
  confirmed key/prefix deletion are exposed through API/SDK/Admin and smoke.
- Round 96: Monitor Version is a live runtime/deployment surface, not a static
  fixture page: `/monitor/version` exposes process/runtime/deployment metadata,
  the fixed deploy script injects commit/build identifiers and Admin/smoke
  guards reject fixture-backed or stale version bundles.
- Round 97: Tool OpenAPI Drift is a live contract snapshot surface, not a
  static fixture page: `/tools/openapi/drift` exposes snapshot existence,
  hash, path/schema/operation counts and command metadata through
  API/SDK/Admin with tool smoke and deploy guards.
- Round 98: Tool Export is a live protocol/preview surface, not a static
  fixture page: `/tools/export/protocol` and `/tools/export/preview` expose the
  current-page CSV contract and server row-cap behavior through API/SDK/Admin
  with tool smoke and deploy guards.
- Round 99: shared current-page export buttons use the live Tool Export
  protocol instead of SDK fixtures, so table exports across Admin pages honor
  the same server row-cap contract.
- Round 100: Integration Mail matches the current foundation expectation for
  notification provider operations: Admin uses live template/outbox list,
  detail, render preview and queued-processing controls instead of fixture
  rows.
- Round 101: Integration SMS now uses the same live template/outbox operator
  loop as Mail, including detail, render preview, queued-processing controls,
  filtered current-page exports and stale-fixture deploy guards.
- Round 102: Collaboration Messages moved from fixture rows to live message
  lifecycle operations: list/detail, create, mark-read, archive and delete are
  seed-backed, SDK-backed and smoke-guarded.
- Round 103: Collaboration Notices moved from fixture rows to live notice
  lifecycle operations: list/detail, create, publish and archive are SDK-backed
  and smoke-guarded.
- Round 104: Collaboration Todos moved from fixture rows to live todo
  lifecycle operations: list/detail, create, assign, complete and cancel are
  SDK-backed and smoke-guarded.
- Round 105: Collaboration Approval Lite moved from fixture rows to live
  approval operations: list/detail, create, approve and reject are SDK-backed
  and smoke-guarded.
- Round 106: Integration WeChat/WebSocket design pages moved from fixture rows
  to live design reads through API/SDK/Admin, with design smoke and stale
  frontend guards. Payment/BillingDesign remains explicit-admission because it
  touches real payment/refund/reconciliation scope.
- Round 107: Monitor Status now matches the current foundation expectation for
  server monitoring: `/monitor/status` returns live dependency probes plus
  CPU, memory, disk and process resource snapshots, and Admin no longer falls
  back to SDK fixtures.
- Round 108: Monitor Queues moved beyond read-only metrics: operators can
  pause/resume admitted BullMQ queues through API/SDK/Admin under
  `monitor:queue:manage`, and smoke always restores the queue to resumed
  state.
- Round 109: Security log Admin pages no longer mask API failures with fixture
  rows; operation logs now use the API's actor/action/resource/location/status,
  duration and time filters from Admin.
- Round 110: Monitor Jobs now exposes terminal run-log retention cleanup
  through API/SDK/Admin, rejects queued/running cleanup and keeps the Jobs page
  live-only with smoke/deploy guards.
- Round 111: OAuth token Admin now uses live list/detail/revoke APIs only,
  disables revoke without `integration:oauth:manage` and has smoke/deploy
  guards that reject fixture fallback or stale bundles.
- Round 112: Online Users Admin now uses live list/detail/kick-out and expired
  cleanup APIs only, so session/token failures cannot be hidden behind SDK
  fixture rows.

## Explicit Non-Claims

Explicit user admission is still required for production multi-tenancy,
BPMN/full workflow, full report designer, real payment/refund/reconciliation,
CRM/ERP/MES/WMS/mall/member suites, real external notification provider fleet
and AI/RAG/Agent workflow.

## Next Focus

Next round should continue the remaining admitted P0/P1 foundation queue by
dependency value while keeping Payment, Reports/ExportJobs and OpenForge
direct writes behind explicit user admission.
