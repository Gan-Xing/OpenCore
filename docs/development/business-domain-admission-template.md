# Business-Domain Admission Template

Use this template before admitting CRM, ERP, MES, WMS, mall, member, payment,
AI/RAG/Agent, or any other tenant-owned business domain. T7f
business-domain admission remains closed until this record is complete and the
finite delivery queue is accepted.

## Admission Record

- Domain:
- Module prefix:
- User value:
- Owning package:
- Default tenant visibility:
- Default module enablement:
- Explicit non-goals:
- Rollback owner:

## Required Scope

- Tenant ownership: every persisted business row has a `tenantId` owner unless
  the record is intentionally global and documented here.
- Data model: Prisma models, indexes, unique constraints, seed data, and
  migration rollback notes are listed before implementation.
- API contract: controllers, DTOs, error codes, OpenAPI tags, SDK client/types,
  and pagination/export behavior are listed before Admin work starts.
- Permissions: module registry entries, permission codes, menus, Admin routes,
  and route access bindings all use the same resource/action vocabulary.
- Admin live-only UX: pages use SDK services only, include loading, empty,
  failure, create/update/delete states, and have no fixture fallback.
- Tenant isolation tests: positive owner access plus negative cross-tenant
  reads/writes/deletes are covered by typed smoke.
- Runtime isolation: cache keys, queues, WebSocket rooms, files, audit logs,
  login/session effects, and background jobs carry tenant context when used.
- Guards: add or extend a `guard:*` script that locks schema, registry,
  OpenAPI/SDK/Admin, smoke, and docs markers for this domain.
- Release evidence: `pnpm release:gate` passes after the domain is implemented,
  deployed, and public-smoked.

## Finite Delivery Queue

1. Data model and tenant ownership migration.
2. API, permissions, OpenAPI, SDK, and error contract.
3. Admin live-only surface with empty and failure states.
4. Tenant isolation smoke, guard, and release gate update.
5. Deploy, public smoke, docs update, commit, and push.

Do not start implementation until the domain has a finite queue like the one
above and a clear stop condition.
