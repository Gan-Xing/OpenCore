# OpenCore Cycle-027 Backlog

Date: 2026-06-30

## Finite Queue

1. C027 admission/design docs.
2. Prisma CRM models, migration, seed data, and tenant-owned constraints.
3. NestJS CRM API with RBAC, audit events, owner transfer, reminders, summary,
   current-page export, and Swagger coverage.
4. SDK client/types plus module-registry permissions, menus, Admin routes, and
   access bindings.
5. Admin CRM pages using live SDK data only, shared export/detail/filter
   helpers, and polished Ant Design Pro interaction states.
6. Typed smoke and tenant guard for positive commercial flows and negative
   cross-tenant isolation.
7. Full validation: format, typecheck, lint, tests, local smoke, release gate,
   deploy, public smoke, and one independent commit.

## Commercial Acceptance

- A tenant admin can create a lead, convert it to a customer, add contacts,
  create an opportunity, move the opportunity through stages, record follow-ups,
  create reminders, attach file metadata, transfer ownership, and see summary
  metrics without fixture fallback.
- A foreign tenant CRM row is not visible through list/detail/update/delete,
  and direct attempts do not mutate it.
- CRM pages are usable for daily operations: dense tables, status tags, quick
  filters, detail drawer, create/edit forms, owner transfer, follow-up/task
  actions, and current-page export.

## Stop Condition

C027 is complete only when the repository evidence proves every admission
requirement above and the release gate plus public smoke pass on the deployed
OpenCore instance.
