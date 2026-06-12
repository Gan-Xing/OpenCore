# @opencore/online-user

Online-user runtime boundary for OpenCore.

This package owns session records, bounded filters, active/revoked summary,
kick-out policy and Prisma persistence for monitor online-user workflows.
`apps/api` should only import the module/service to expose HTTP routes and
compose monitor summaries.
