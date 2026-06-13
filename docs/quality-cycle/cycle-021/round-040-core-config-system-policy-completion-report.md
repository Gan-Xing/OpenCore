# Round 40: core.config System Deletion Policy Completion Report

Feature commit:
`c7a3db8 feat(core-config): guard system config deletion / 保护系统配置删除`

## Scope

Round 40 continued `core.config` productization by adding a persisted
system/custom deletion policy. This closes the built-in-config deletion debt
left after batch deletion, without claiming secret vault/KMS or broad runtime
feature-flag propagation.

## Delivered

- Added `SystemConfig.system` and migration backfill for seeded built-in config
  rows.
- Marked seed records and SDK fixtures as system-owned while defaulting new
  configs to custom.
- Blocked single and mixed batch deletion of system configs before mutation.
- Exposed `system` through DTO/OpenAPI/SDK/Admin/export surfaces.
- Added Admin System column/filter/detail/export support and disabled deletion
  actions/selection for system rows.
- Extended Admin static smoke and `core.config` smoke with system-delete
  guards.

## Verification

- Standard round gates passed; repeated command transcripts were removed during docs compaction.

## Public Verification

- API deployed at `http://144.217.243.161:39172`.
- Admin deployed at `http://144.217.243.161:39174`.
- Public `pnpm smoke:core-config` passed with `core.config.system-flag`,
  `core.config.system-delete-guard` and
  `core.config.batch-delete.system-guard`.
- Public Admin Config chunk `p__System__Config.c06f078e.async.js` contains the
  system deletion UI guards.
- Public Admin `/api/auth/login` succeeded through the actual browser-origin
  path.
- Public API proved built-in config single delete and mixed batch delete return
  400 while custom config cleanup remains available.

## Remaining Debt

- Broader runtime propagation and feature-flag consumption boundaries.
- Any admitted secret vault/KMS integration.
