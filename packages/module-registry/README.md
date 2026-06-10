# @opencore/module-registry

S3 single source of truth for OpenCore module declarations.

Current scope:

- draft module declarations for S5-S8 shell, RBAC, system management, monitor, and tool baseline;
- permission and menu contracts imported from `@opencore/contracts`;
- registry validation that catches duplicate module codes, duplicate permission codes, duplicate menu keys, menu/permission drift, and P4/P5 scope leakage.

This package does not implement login, RBAC data flow, database schema, or CRUD.
