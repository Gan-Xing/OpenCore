# cycle-021 Round History

Date: 2026-06-14

This file replaces verbose per-round reports. It keeps clusters and rework
only; the ledger keeps state transitions and git log keeps commits.

## Delivered Clusters

- Rounds 1-13: first API/SDK/Admin/permission/seed/OpenAPI loops for notice,
  dept, post, menu, role, permission, user, dict, config, file, login-log,
  audit-log and online-user.
- Rounds 14-23: online-user revocation, file content, menu metadata, role
  assignment, user security mutations, dict options, user post binding and
  department filtering.
- Rounds 24-36: config value/cache, post/dept/user option sources, profile,
  password, avatar, batch mutation, CSV/XLSX import/export and import
  permission split.
- Rounds 37-49: config metadata/export/batch/system policy/runtime, login-log
  type/result schema, lockout/unlock, cleanup and attempt limits.
- Rounds 50-59: logout audit semantics, dept/post ordering, data-scope,
  notice inbox/read analytics, feature flags and login-log location.
- Rounds 60-98: notice templates, delivery records, local/outbox providers,
  SMS HTTP and SMTP adapters, config secret vault, feature-flag
  rollout/audience, outbox state/process/callback/schedule handling and
  mail subject persistence, provider diagnostics, SMS HTTP secret injection,
  SMTP attachments, explicit SMTP TLS policy, inbox realtime events,
  operation-log cleanup, config environment overrides, config secret
  versions/rotation, config vault keyring rotation, operation-log enrichment
  and retention scheduling, plus Monitor Jobs Admin operations, registered
  handler diagnostics, cron dispatch, worker claim and scheduler queue metrics,
  the OpenForge safe Admin workbench, dry-run confirmation, manifest
  preview/detail, Integration provider health/config audit and structured
  IP/location provider lookup, external HTTP JSON GeoIP adapter,
  token/session blacklist maintenance, OAuth token inventory/revoke lifecycle
  and managed HTTP JSON KMS v3 secret-vault envelopes, plus Redis-backed
  Monitor Cache namespace/key operations and live Monitor Version
  runtime/deployment metadata, live Tool OpenAPI drift snapshot metadata and
  live Tool Export protocol/preview wiring.

## Rework Notes

- Round 14 corrected Round 13 online-user by adding real revocation.
- Round 67 corrected Round 66 notice outbox semantics: queued handoff is not a
  successful provider send.
- Round 68 captured the Admin generated-types race: do not run Admin
  `typecheck` and `lint` concurrently.
- Round 74 captured schema/seed drift for `ReportDefinition`: smoke-covered
  endpoints must have migrations and seed records before deployment.
- Round 84 captured legacy unversioned `opencore:vault:` envelope
  deserialization as a permanent unit/smoke guard before future vault changes.
- Round 86 captured OpenForge repo-root resolution as a code invariant:
  API/runtime callers must pass sourceRoot instead of relying on cwd.

## Rule

Do not create one completion report per stage. Update only the files whose
current state, debt or guard rules changed.
