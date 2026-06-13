# cycle-021 Round History

Date: 2026-06-13

This file replaces the 68 verbose per-round completion reports. Standard test,
build, deploy and smoke command transcripts are intentionally omitted. The
quality-cycle ledger keeps commit, deploy and public verification markers.

## Delivered Clusters

- Rounds 1-13: first API/SDK/Admin/permission/seed/OpenAPI loops for notice,
  department, post, menu, role, permission, user, dict, config, file,
  login-log, audit-log and online-user.
- Rounds 14-23: online-user real token/session revocation, file content,
  menu tree metadata, role assignment, user security mutations, dict options,
  user post binding and department filtering.
- Rounds 24-36: config value/cache, post/dept/user option sources, profile,
  password, avatar, user batch mutation, CSV/XLSX import/export and import
  permission split.
- Rounds 37-49: config metadata/export/batch/system policy/runtime, login-log
  type/result schema, lockout/unlock, cleanup and configurable attempt limit.
- Rounds 50-59: self/force logout audit semantics, department/post ordering,
  user/dept data-scope enforcement, notice inbox/read analytics, actor/reason
  fields, runtime feature flags and login-log location.
- Rounds 60-68: notice templates, delivery records, local/outbox providers,
  config secret vault, feature-flag rollout/audience, outbox state hardening
  and operation-log cleanup maintenance.

## Rework Notes

- Round 14 corrected Round 13 online-user by adding real token/session
  revocation.
- Round 67 corrected Round 66 notice outbox semantics: queued external handoff
  is not a successful provider send.
- Round 68 captured the Admin generated-types race: do not run Admin
  `typecheck` and `lint` concurrently.

## Future Rule

Do not create one completion report per stage by default. For each future
round, update only:

- `docs/quality-cycle/ledger.md`: one line with commit/deploy/public markers.
- `handoff.md`, `backlog.md`, `productization-waterline-audit.md`,
  `implementation-notes.md` and `audit.md`: only when current state, debt or
  guard rules change.
- this file: one concise cluster or rework line when the history changes.

A standalone report is allowed only for a real incident or decision record that
cannot be represented in those files.
