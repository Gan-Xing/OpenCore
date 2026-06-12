# @opencore/database

Prisma/PostgreSQL runtime boundary for OpenCore backend packages.

This package owns the NestJS `DatabaseModule`, `PrismaService`, Prisma client
factory helpers, transaction helper and seed step runner. It deliberately avoids
depending on `apps/api` runtime config; applications can pass an explicit
database URL or rely on `DATABASE_URL` having already been loaded into the
process environment.
