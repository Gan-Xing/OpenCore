# cycle-014 Audit

London time: 2026-06-11 04:40 Europe/London

## Theme

Admin route/access binding drift.

## Scope

- `tools/scripts/check-admin-route-access.ts`
- `apps/admin/.umirc.ts`
- `apps/admin/src/access.ts`
- `packages/module-registry/src/modules.ts`
- Module admission and OpenForge CI docs

## Findings

- F1: `registry:admin-routes:check` verified that each registry Admin route path existed in `.umirc.ts` and that each permission code appeared in `access.ts`.
- F2: The check did not verify that a route's `.umirc.ts` `access` key maps to the same permission code declared by the module registry route. A route could keep the right path but point at the wrong access guard and still pass.
- F3: Module admission docs described matching permission codes but did not spell out binding-level route access drift. OpenForge CI docs omitted the route/access and registry tag drift commands from the full local command list.

## Decision

Parse `.umirc.ts` and `access.ts` with the TypeScript compiler API. Build route `path -> access` bindings and access `permissionCode -> accessKey` bindings, then compare each module registry Admin route permission to the route's actual access key. Keep the existing route presence and permission presence checks.
