# cycle-021 Capstone Acceptance Backlog

Started: 2026-06-12
Last compacted: 2026-06-14

This is the finite Capstone Acceptance & Debt Closure queue. It must not be
expanded into automatic follow-up work.

## Scope

Pre-authorized foundation scope: System, Security, Monitor,
Tools/OpenForge foundation, Collaboration center foundations, IP/location,
OAuth token management, JWT blacklist, notice templates/delivery, KMS/secret
vault, operation-log maintenance, scheduler/monitor depth and config runtime
governance.

## Delivered Clusters

- Rounds 1-13: first live API/SDK/Admin stages for core system, security and
  monitor modules.
- Rounds 14-23: online-user revocation, file content, menu metadata,
  role/user bindings, dict options and dept filtering.
- Rounds 24-36: config value/cache, option sources, profile/password/avatar,
  batch mutations and CSV/XLSX import/export.
- Rounds 37-49: config metadata/runtime, login-log schema/lockout/cleanup and
  runtime login policy.
- Rounds 50-59: logout audit semantics, ordering, data-scope, notice
  inbox/read analytics, feature flags and login-log location.
- Rounds 60-115: notice provider/outbox reliability, config vault/KMS,
  monitor jobs/cache/status/version, OpenForge, integration/collaboration and
  Admin live-only hardening.

## Active Queue

1. Build `docs/quality-cycle/cycle-021/acceptance-matrix.md`.
2. Build a global no-fixture-fallback guard.
3. Clean System Users fallback.
4. Clean System Roles fallback.
5. Clean or verify System Permissions fallback closure.
6. Clean or verify System Posts fallback closure.
7. Clean System Files fallback.
8. Clean System Config fallback.
9. Clean System Notices fallback.
10. Add explicit public smoke, split into public API smoke and public Admin
    smoke.
11. Rejudge the waterline with strict `Meets` rules.
12. Sync progress, handoff, ledger and completion report.

## Public Smoke Rule

- Local smoke: requests against the fixed local smoke/API runtime.
- Public API smoke: real request succeeds against the public API URL.
- Public Admin smoke: real request succeeds against the public Admin URL or
  a public Admin page/runtime surface.
- Bundle marker smoke: built Admin chunks contain required markers and reject
  forbidden fixture/stale markers.
- Deploy guard: fixed deployment script blocks stale or fixture-backed
  artifacts.

Printing a public URL, documenting a public URL or checking only built bundle
markers does not count as public smoke.

## Out Of Scope

- Payment
- BillingDesign
- Optional Reports
- ExportJobs
- OpenForge direct schema writes
- OpenForge migration writes
- OpenForge business-code writes
- BPMN/full workflow
- CRM
- ERP
- MES
- WMS
- mall
- member
- AI/RAG/Agent

## Rework Notes

- Round 14 corrected Round 13 online-user by adding real revocation.
- Round 67 corrected Round 66 outbox semantics before real provider work.
- Round 84 added legacy unversioned vault-envelope deserialization guards while
  moving current writes to v2 key-ID envelopes.
- If a stage creates a semantic bug that should have been caught in the same
  stage, add the missing test, smoke or deploy guard before moving on.
