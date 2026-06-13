# cycle-021 Capability Map Productization Backlog

Started: 2026-06-12
Last compacted: 2026-06-13

This backlog is the working queue, not a full transcript. `round-history.md`
and the quality-cycle ledger keep the historical details.

## Scope

P0/P1 foundation capabilities are auto-admitted as independent rounds:
System, Security, Monitor, Tools/OpenForge foundation, IP/location, OAuth token
management, JWT blacklist, notice templates/delivery, KMS/secret vault,
operation-log maintenance, scheduler/monitor depth and config runtime feature
flags.

Large business/platform domains still need explicit admission:
CRM/ERP/MES/WMS/mall/member, real payment, production multi-tenancy, BPMN/full
workflow, full report designer, big-data async export execution, RAG/Agent/AI
workflow, industry packages and OpenForge direct schema/business-code writing.

## Completed Foundation Clusters

- Rounds 1-13: first live Admin/API/SDK loops for notice, department, post,
  menu, role, permission, user, dict, config, file, login-log, audit-log and
  online-user.
- Rounds 14-23: online-user real revocation, file content, menu tree metadata,
  role assignments, user security mutations, dict options, user post binding
  and department filtering.
- Rounds 24-36: config value/cache, post/dept/user option sources, profile,
  password, avatar, batch mutations, CSV/XLSX import/export and permissions.
- Rounds 37-49: config metadata/export/batch/system policy/runtime, login-log
  schema/lockout/cleanup and runtime login policy.
- Rounds 50-59: logout/force-logout audit semantics, department/post ordering,
  data-scope enforcement, notice inbox/read analytics, actor/reason fields,
  feature flags and login-log IP/location.
- Rounds 60-69: notice templates, delivery records, secret vault, local
  provider, feature-flag rollout/audience, Integration outbox bridge and
  outbox state hardening/process, plus operation-log cleanup maintenance.

## Latest Done

Round 69 completed notice outbox provider processing:

- mail/SMS process APIs are protected by existing integration manage
  permissions;
- queued outbox rows require enabled channel-compatible providers before they
  can move to `sent`;
- processed outbox rows synchronize matching notice delivery records to
  `sent`;
- Admin System Notices exposes a queued outbox process action;
- smoke/deploy guards cover queued-to-sent behavior, OpenAPI paths and stale
  Admin markers.

## Active P1/P2 Queue

1. Notice provider reliability: signed callback intake, real SMTP/SMS adapters,
   retry scheduling and realtime push.
2. Config governance: multi-environment rollout controls, external KMS binding,
   key rotation and secret version history.
3. Operation-log enrichment: retention policy scheduling, structured
   duration/location fields and governance.
4. Scheduler/monitor operation depth: enable/disable/run-now, run-log
   diagnosis, retry/timeout controls and registry whitelist visibility.
5. OpenForge Admin: plan/diff/check/apply/manifest/rollback surfaces over the
   existing safe generator boundary.
6. Integration health/config audit: provider readiness, failure history,
   config validation and operator diagnostics.

## Current Guard Debt

- Keep adding smoke/deploy guards only when they prevent a real repeated
  failure.
- Do not copy the standard command list into this file.
- If a round creates a semantic bug that should have been caught in the same
  stage, add the missing test or smoke before moving on.

## Closed P0 Rework

- Round 14 corrected Round 13 online-user from list/detail/kick-only into real
  token/session revocation.
- Round 67 corrected Round 66 Integration outbox semantics before real provider
  work could build on the wrong state model.

No open P0 blocker remains in the current foundation waterline.
