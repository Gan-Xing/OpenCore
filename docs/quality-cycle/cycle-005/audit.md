# cycle-005 Audit

London time: 2026-06-11 02:44:57 Europe/London

## Findings

OpenCore now has summary endpoints, bounded list filters, and guarded action transitions for the admitted collaboration, operations, and integration modules. The next gap is read-only detail contracts. Admin pages and SDK consumers can list records and run actions, but they do not have stable `GET .../:id` or `GET .../:code` endpoints to power detail drawers, action confirmation screens, or external SDK inspection.

## Stage 1 Platform Core

The platform has `requireRecord` helpers, permission decorators, and DTOs that are suitable for detail endpoints. The missing piece is applying these consistently to admitted modules while keeping deleted/hidden resources out of detail responses.

## Stage 2 Contract System

The SDK has list and action methods, but not detail methods. OpenAPI and SDK path specs need stable detail routes so consumers can fetch a record before showing action state or audit fields.

## Stage 3 OpenForge

OpenForge docs cover bounded filters and action guards. They should also state that list/action-heavy generated modules need read-only detail endpoints when Admin pages expose detail drawers or confirmation screens.

## Stage 4 Collaboration

Messages, notices, todos, and Approval Lite have list/action endpoints but no detail endpoints. Deleted messages should remain hidden from detail lookups.

## Stage 5 Workflow / Reports / Jobs

Jobs, job runs, online sessions, and report definitions need detail contracts. This matches monitor/job detail and log detail patterns without implementing a full scheduler or report designer.

## Stage 6 Integration Capability

Providers, mail/SMS templates, and outbox messages need detail contracts. Provider detail must remain redacted, and outbox detail must stay mock/design-boundary safe.
