# @opencore/system

OpenCore system-domain package.

The package is filled in dependency order. Admitted subdomains:

- `system-dict`: dictionary type/value DTOs, seed data, repository contracts,
  Prisma persistence, service orchestration and export preview support.
- `system-config`: system config DTOs, seed data, secret-safe redaction,
  repository contracts, Prisma persistence, service orchestration and export
  preview support.
- `system-notice`: system notice DTOs, seed data, lifecycle transitions,
  repository contracts, Prisma persistence, service orchestration and export
  preview support.
- `system-dept`: department tree DTOs, seed data, repository contracts, Prisma
  persistence, service orchestration, cycle guards and export preview support.
- `system-post`: post/position DTOs, seed data, repository contracts, Prisma
  persistence, service orchestration and export preview support.
- `system-menu`: admin menu DTOs, registry-backed seed records, repository
  contracts, Prisma persistence, permission-code validation, service
  orchestration and export preview support.
- `system-role`: role DTOs, registry-backed seed records, repository contracts,
  Prisma persistence, permission-code validation, system-role deletion guards,
  user/permission relation cleanup, service orchestration and export preview
  support.
- `system-user`: user DTOs, seed records, repository contracts, Prisma
  persistence, role-code validation, password hashing, service orchestration,
  user-role cleanup and export preview support.

Later self-loop rounds will move auth, permission guards and data-scope runtime
into the security package in the documented order.
