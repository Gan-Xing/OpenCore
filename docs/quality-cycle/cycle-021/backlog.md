# cycle-021 Capability Map Productization Backlog

Started: 2026-06-12
Last compacted: 2026-06-13

This backlog is the working queue, not a full transcript. Per-round completion
reports and the quality-cycle ledger keep the historical details.

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
- Rounds 60-68: notice templates, delivery records, secret vault, local
  provider, feature-flag rollout/audience, Integration outbox bridge and
  outbox state hardening, plus operation-log cleanup maintenance.

## Latest Done

Round 68 completed operation-log cleanup maintenance:

- `core:audit-log:delete` is registered, seeded and guarded;
- batch delete rejects empty, duplicate and missing IDs without partial delete;
- clean-all returns affected count and leaves the clean request auditable;
- Admin Operation Logs exposes selected delete and clean-all controls;
- smoke/deploy guards cover API behavior, OpenAPI paths and stale Admin bundle
  markers.

## Active P1/P2 Queue

1. Notice provider reliability: real external SMTP/SMS execution or callback
   intake, retry policy and realtime push.
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
