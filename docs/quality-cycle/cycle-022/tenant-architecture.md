# OpenCore Cycle-022 Tenant Architecture

Date: 2026-06-22

## Decision

OpenCore uses global `User` plus tenant-local `TenantMembership`. Tenant state is a server-side security boundary, not a client-selected filter.

## Runtime Modes

- `OPENCORE_TENANCY_MODE=single`: automatically uses the default `root` tenant for single-customer deployments.
- `OPENCORE_TENANCY_MODE=shared`: enables tenant discovery, tenant selection, tenant switching, and strict tenant isolation.

Both modes use the same Tenant/TenantPlan/TenantMembership data model.

## T1/T2 Model

- `TenantPlan` owns plan metadata and limits.
- `TenantPlanModule` grants stable module codes to a plan.
- `Tenant` owns tenant identity, status, slug/code, plan, and expiration.
- `TenantMembership` connects global users to tenants with status, owner flag, and transitional dept assignment.
- `TenantMembershipRole` and `TenantMembershipPost` mirror existing `UserRole` and `UserPost` for root tenant parity.
- `PlatformRole`, `UserPlatformRole`, and `PlatformRolePermission` separate platform operator authorization from tenant roles.
- `OnlineUserSession` stores the authenticated `tenantId`, `membershipId`, and `accessMode`.
- Access tokens store the same tenant context as `tid`, `mid`, and `am`.
- `RequestContext` stores actor, tenant, membership, and access mode after guard authentication.

## Boundary Rules

- Ordinary APIs must not trust body/query/header `tenantId`.
- Tenant switching must be a server endpoint that reissues token/session state.
- Tenant selection uses a short-lived login ticket, not an authenticated access token.
- Bearer authentication must reject token/session tenant mismatches and inactive tenant/member state.
- Tenant-owned repositories must eventually use tenant-scoped access or explicit tenant predicates.
- Platform visit mode must be explicit, permissioned, time-bounded, and audited.

## Sequencing

T1 creates the foundation and root backfill. T2 binds authentication/session/request context to tenant membership. T3/T4 migrate tenant-owned data. T5 propagates runtime context. T6 finishes live Admin control plane.
