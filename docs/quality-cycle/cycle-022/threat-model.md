# OpenCore Cycle-022 Threat Model

Date: 2026-06-23

## Primary Threats

| Threat                                       | Risk                                    | Control                                                                                                                 |
| -------------------------------------------- | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Client sends another tenant's `tenantId`     | Cross-tenant data exposure              | Server derives tenant from validated token/session; T2 smoke proves a forged `tenant-id` header does not alter context. |
| User guesses another tenant object's ID      | Existence leak or unauthorized mutation | Tenant-scoped repositories return 404 inside T3/T4.                                                                     |
| Suspended tenant/member keeps old session    | Continued unauthorized access           | Auth validates tenant/member/session status on every bearer request.                                                    |
| Platform admin accesses tenant silently      | Undetectable impersonation              | T6 requires explicit platform visit permission, reason, expiry, and audit.                                              |
| Plan removes module but API still allows it  | Paid entitlement bypass                 | T3a clips effective tenant permissions by module registry and tenant plan modules before permission guards run.         |
| Cache/file/queue key misses tenant namespace | Cross-tenant runtime leakage            | T5 namespaces Redis, file object keys, queue payloads, WebSocket rooms, outbox, and OAuth state.                        |
| Migration leaves orphan or missing root rows | Broken single-mode compatibility        | T1 migration and smoke compare User/UserRole/UserPost counts to root membership bridge counts.                          |

## Current T1/T2/T3a Coverage

- Root tenant exists after migration/seed.
- All existing users get a root membership.
- Legacy `UserRole` and `UserPost` are copied into root membership bridges.
- Platform role model exists and can carry `platform:tenant:*` permissions.
- Foundation API rejects the most dangerous design by omission: it has no body/query/header `tenantId` selector.
- Access tokens and online sessions bind current tenant and membership.
- Request context is populated from authenticated bearer state, not client tenant headers.
- Tenant switch reissues token/session and revokes the previous token.
- Authenticated tenant sessions derive roles/posts from active membership bridges.
- Permission guards receive plan-clipped effective permissions.
- Data-scope guards resolve user/dept scope from the active membership where available.

## Remaining Exposure

Tenant-owned Role/Dept/Post CRUD, tenant-scoped repositories, runtime propagation, and platform visit audit are still required before Cycle-022 can be called complete.
