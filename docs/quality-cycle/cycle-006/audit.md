# cycle-006 Audit

London time: 2026-06-11 03:02:08 Europe/London

## Findings

Cycle 005 established backend and SDK detail endpoints for the admitted collaboration, operations, and integration modules. The remaining user-facing gap is that the Admin pages still render flat fixture tables. They do not expose detail drawers, do not exercise fixture-level detail selectors, and do not demonstrate the read/detail/action separation that OpenForge should generate for table-driven modules.

## Stage 1 Platform Core

Admin has repeated ProTable pages but no small shared detail presentation kernel for read-only fixture-backed records. Adding a reusable drawer/details helper keeps the UI consistent and avoids one-off sensitive-data rendering.

## Stage 2 Contract System

SDK fixtures expose list arrays but not detail selectors. Admin pages therefore re-use row objects directly instead of going through detail-shaped lookup contracts that mirror the new `GET .../:id` and `GET .../:code` methods.

## Stage 3 OpenForge

OpenForge now documents API detail endpoints, but its Admin authoring guidance still needs to describe generated detail drawers: list rows should open detail by id/code, sensitive values must stay redacted, and design-only topics must remain design-only.

## Stage 4 Collaboration

Messages, notices, todos, and Approval Lite pages show action-policy columns but lack detail drawers for body, business binding, timeline, and terminal-state context. This weakens the confirmation UX for guarded actions.

## Stage 5 Workflow / Reports / Jobs

Jobs, online users, reports, and export-job design pages lack read-only detail views for payload/query schema/runbook bindings. RuoYi/Yudao separate job page, job detail, job logs, and status actions; OpenCore should expose the same conceptual separation in Admin without implementing a full scheduler or report designer.

## Stage 6 Integration Capability

Provider, mail template, SMS template, OAuth, and design-boundary pages lack detail drawers for redacted config, callback/security policy, template body, and mock/design-only boundaries. The Admin experience should make redaction and disabled/provider policies visible without adding production integrations.
