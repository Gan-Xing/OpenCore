# cycle-011 Implementation Notes

## Plan

- Add visible read-only policy rendering to core Admin wrappers.
- Disable RBAC create/edit/delete placeholder controls with explicit reasons.
- Pass page-specific read-only reasons through RBAC, system and security pages.
- Extend Admin smoke coverage for read-only policy and disabled mutation affordances.
- Update OpenForge docs for generated read-only core wrapper affordances.

## Implemented

- Added `readOnlyReason` to `RbacTable` and `SystemManagementTable`.
- Rendered the read-only reason in core table toolbars while keeping filters, detail and current-page export active.
- Disabled RBAC `New`, `Edit` and `Delete` placeholder controls with the read-only reason instead of leaving enabled no-op controls.
- Added page-specific read-only reasons to users, roles, permissions, menus, dictionaries, system config, files, login logs and operation logs.
- Extended Admin smoke checks so core wrappers must render the read-only policy and RBAC mutation-looking controls must stay disabled.
- Updated OpenForge V1 docs so generated core Admin wrappers show read-only reasons and disable mutation-looking controls until real write contracts are admitted.
