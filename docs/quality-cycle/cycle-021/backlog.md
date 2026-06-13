# cycle-021 Capability Map Productization Backlog

Started: 2026-06-12
Last compacted: 2026-06-13

This is the working queue, not a transcript.

## Scope

Auto-admitted P0/P1 foundation work: System, Security, Monitor,
Tools/OpenForge foundation, IP/location, OAuth token management, JWT
blacklist, notice templates/delivery, KMS/secret vault, operation-log
maintenance, scheduler/monitor depth and config runtime governance.

Explicit admission required: CRM/ERP/MES/WMS/mall/member, real payment,
production multi-tenancy, BPMN/full workflow, full report designer, big-data
async export, RAG/Agent/AI workflow, industry packages and OpenForge direct
schema/business-code writing.

## Delivered Clusters

- Rounds 1-13: first live API/SDK/Admin loops for core system/security/monitor
  modules.
- Rounds 14-23: online-user revocation, file content, menu metadata, role/user
  bindings, dict options and dept filtering.
- Rounds 24-36: config value/cache, option sources, profile/password/avatar,
  batch mutations and CSV/XLSX import/export.
- Rounds 37-49: config metadata/runtime, login-log schema/lockout/cleanup and
  runtime login policy.
- Rounds 50-59: logout audit semantics, ordering, data-scope, notice
  inbox/read analytics, feature flags and login-log location.
- Rounds 60-77: notice template/delivery/provider/outbox work, SMS HTTP and
  SMTP adapters, config vault and rollout/audience, operation-log cleanup, plus
  mail subject persistence, provider diagnostics, Monitor Jobs Admin operations
  and registered handler diagnostics.

Latest done: Round 77 Integration provider diagnostics with read-only
readiness checks, outbox backlog/failure insight, operator actions and
Admin/SDK/OpenAPI/smoke visibility.

## Active P1/P2 Queue

1. Notice provider reliability: broader provider-secret injection, realtime
   push and STARTTLS/attachments.
2. Config governance: multi-environment rollout, external KMS, key rotation
   and secret version history.
3. Operation-log enrichment: retention scheduling, duration/location fields
   and governance.
4. OpenForge Admin: plan/diff/check/apply/manifest/rollback surfaces.
5. Integration health/config audit: provider readiness, failure history,
   config validation and operator diagnostics.
6. Scheduler/monitor worker parity: external BullMQ worker execution, cron
   dispatch and queue metrics beyond the current registered manual executor.

## Rework Notes

- Round 14 corrected Round 13 online-user by adding real revocation.
- Round 67 corrected Round 66 outbox semantics before real provider work.
- If a round creates a semantic bug that should have been caught in the same
  stage, add the missing test or smoke before moving on.
