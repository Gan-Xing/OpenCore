# cycle-021 Capability Map Productization Backlog

Started: 2026-06-12
Last compacted: 2026-06-14

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
- Rounds 60-84: notice template/delivery/provider/outbox work, SMS HTTP and
  SMTP adapters, config vault and rollout/audience, operation-log cleanup, plus
  mail subject persistence, provider diagnostics, SMS HTTP secret injection,
  SMTP attachments, explicit SMTP TLS policy, inbox realtime events, Monitor
  Jobs Admin operations, registered handler diagnostics and config
  environment overrides plus config secret version history/rotation and vault
  keyring rotation.

Latest done: Round 84 config vault key rotation with env-bound keyring status,
v2 key-ID envelopes, legacy unversioned envelope deserialization, current and
versioned secret rewrap, SDK/Admin/OpenAPI visibility and smoke/deploy
coverage for active-key state, guards and plaintext leakage.

## Active P1/P2 Queue

1. Operation-log enrichment: retention scheduling, duration/location fields
   and governance.
2. OpenForge Admin: plan/diff/check/apply/manifest/rollback surfaces.
3. Integration health/config audit: provider readiness, failure history,
   config validation and operator diagnostics.
4. Scheduler/monitor worker parity: external BullMQ worker execution, cron
   dispatch and queue metrics beyond the current registered manual executor.
5. Optional managed-KMS provider adapter if deployment needs cloud KMS APIs
   beyond the current env-bound keyring.

## Rework Notes

- Round 14 corrected Round 13 online-user by adding real revocation.
- Round 67 corrected Round 66 outbox semantics before real provider work.
- Round 84 added legacy unversioned vault-envelope deserialization guards while
  moving current writes to v2 key-ID envelopes.
- If a round creates a semantic bug that should have been caught in the same
  stage, add the missing test or smoke before moving on.
