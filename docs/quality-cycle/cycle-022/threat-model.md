# OpenCore Cycle-022 Threat Model

Date: 2026-06-22

## Primary Threats

| Threat                                       | Risk                                    | Control                                                                                                                            |
| -------------------------------------------- | --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Client sends another tenant's `tenantId`     | Cross-tenant data exposure              | Server derives tenant from validated token/session; T1 foundation API has no tenant selector.                                      |
| User guesses another tenant object's ID      | Existence leak or unauthorized mutation | Tenant-scoped repositories return 404 inside T3/T4.                                                                                |
| Suspended tenant/member keeps old session    | Continued unauthorized access           | T2 validates tenant/member/session on every authenticated request.                                                                 |
| Platform admin accesses tenant silently      | Undetectable impersonation              | T6 requires explicit platform visit permission, reason, expiry, and audit.                                                         |
| Plan removes module but API still allows it  | Paid entitlement bypass                 | T3/T6 compute effective permissions from module registry, plan modules, tenant role permissions, tenant status, and member status. |
| Cache/file/queue key misses tenant namespace | Cross-tenant runtime leakage            | T5 namespaces Redis, file object keys, queue payloads, WebSocket rooms, outbox, and OAuth state.                                   |
| Migration leaves orphan or missing root rows | Broken single-mode compatibility        | T1 migration and smoke compare User/UserRole/UserPost counts to root membership bridge counts.                                     |

## Current T1 Coverage

- Root tenant exists after migration/seed.
- All existing users get a root membership.
- Legacy `UserRole` and `UserPost` are copied into root membership bridges.
- Platform role model exists and can carry `platform:tenant:*` permissions.
- Foundation API rejects the most dangerous design by omission: it has no body/query/header `tenantId` selector.

## Remaining Exposure

T1 does not yet enforce tenant-bound tokens, tenant-scoped repositories, runtime propagation, or platform visit audit. Those are required before Cycle-022 can be called complete.
