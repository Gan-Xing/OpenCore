# cycle-011 Audit

London time: 2026-06-11 04:12:49 Europe/London

## Findings

Cycle 010 added read-only detail drawers to core Admin pages, but the RBAC wrapper still renders mutation-looking controls (`New`, `Edit`, `Delete`) without an explicit read-only/current-state policy. That creates a weaker UX contract than the newer admitted pages, where action columns expose guarded/current-state policy labels.

- `RbacTable` renders create/edit/delete controls for fixture-backed pages even though no mutation workflow is admitted in this cycle.
- The buttons are visually enabled but have no mutation behavior, so the UI does not clearly communicate the no-write boundary.
- `SystemManagementTable` has no mutation buttons, but it also lacks a visible read-only policy in the table toolbar.
- Core pages now pass filter/export/detail metadata, but not a page-level read-only reason that can be checked by smoke tests.
- OpenForge docs cover current-state guards and read-only details generally, but not generated core wrapper affordances for disabled mutation controls.

## Target

Make core Admin wrapper mutation affordances explicit: fixture-backed/core read-only pages must show a read-only policy reason, keep detail/export active, and disable mutation-looking controls until a real write workflow is admitted.

## Non-Goals

- No backend writes.
- No new API mutation contracts.
- No role/permission/system CRUD implementation.
- No copied reference project code.
