# Permission Deprecation Policy

OpenCore permission codes are stable cross-end contracts. A permission code must not be silently deleted from the module registry, API guards, SDK, Admin access rules, tests, or documentation.

## Required Deprecation Plan

Before a permission code can be removed, create a plan containing:

- `code`: the existing permission code.
- `deprecatedSince`: the cycle or release that introduced the deprecation.
- `replacementCode`: the replacement permission when one exists.
- `migrationNote`: the operator/developer migration note.
- Compatibility window: at least one release cycle where the old code is still recognized.

The contract helper `validatePermissionDeprecationPlan` in `@opencore/contracts` validates the required metadata. Removal is allowed only after the compatibility window and after Admin, SDK, OpenAPI, registry, seed, and tests have moved to the replacement.

## Prohibited

- Deleting a permission from `packages/module-registry` without a deprecation plan.
- Reusing a deleted permission code for a different resource/action.
- Hiding permission removal inside an unrelated refactor.
