# cycle-021 Reference Comparison

Date: 2026-06-15

Reference comparison is capability-based, not commit-count based. OpenCore
translates stable enterprise admin foundations into its own package-owned
runtime, typed SDK, Umi Admin, permission/menu registry, OpenAPI snapshots,
smoke scripts and deploy guards.

## Reference Heads

- RuoYi-Vue: `41720e624c5a668c7d3777835e4c87095a7a1dfd`
- Yudao backend: `51b3d2d8cddd9a2a48e1edc2a7267359f61264cb`
- Yudao Admin: `17428e98676c8a626f66da780c7c854c73d6089f`

## Comparison Rules

- Compare product capabilities and operator workflows, not raw commit volume.
- Keep OpenCore-native boundaries: package-owned runtime, typed SDK, Umi
  Admin, OpenAPI snapshots and smoke/deploy guards.
- A minimal stage is one deployable acceptance unit, not permission to leave a
  product thin forever.
- Full `Meets` requires live API, live SDK, live-only Admin, no fixture
  fallback, local smoke, public API smoke, public Admin smoke and deploy guard.
- Bundle marker smoke is not a substitute for real public API/Admin smoke.

## Productization Acceptance

This table is a comparison index. The detailed acceptance matrix for the seven
fixed closure rows lives in `acceptance-matrix.md`; current waterline details
live in `productization-waterline-audit.md`.

| Capability         | RuoYi/Yudao counterpart                        | OpenCore API            | OpenCore Admin               | Live-only | Public smoke | Fixture fallback | Still needed                                                                          |
| ------------------ | ---------------------------------------------- | ----------------------- | ---------------------------- | --------- | ------------ | ---------------- | ------------------------------------------------------------------------------------- |
| System Users       | System user management                         | live                    | live-only                    | yes       | yes          | no               | Keep guard and public smoke current.                                                  |
| System Roles       | System role management                         | live                    | live-only                    | yes       | yes          | no               | Keep guard and public smoke current.                                                  |
| System Permissions | Permission catalog/menu authority              | live                    | live-only                    | yes       | yes          | no               | Keep guard and public smoke current.                                                  |
| System Menus       | Menu tree and route authority                  | live                    | live-only                    | yes       | yes          | no               | Keep registry/access drift guard current.                                             |
| System Posts       | Post management                                | live                    | live-only                    | yes       | yes          | no               | Keep guard and public smoke current.                                                  |
| Departments        | Organization/dept management                   | live                    | live-only                    | yes       | yes          | no               | None in admitted scope.                                                               |
| Dicts              | Dictionary management                          | live                    | live-only                    | yes       | yes          | no               | None in admitted scope.                                                               |
| System Config      | Config, runtime, feature flags, secrets        | live                    | live-only                    | yes       | yes          | no               | Full external KMS fleet expansion needs explicit admission.                           |
| System Notices     | Notice management/inbox/templates/outbox       | live                    | live-only                    | yes       | yes          | no               | Real provider fleet operations need explicit admission.                               |
| System Files       | File service and file center                   | live                    | live-only                    | yes       | yes          | no               | File provider expansion needs explicit admission.                                     |
| Security Logs      | Login and operation logs                       | live                    | live-only                    | yes       | yes          | no               | Historical GeoIP backfill remains out of scope.                                       |
| Online Users       | Online sessions/token revocation               | live                    | live-only                    | yes       | yes          | no               | None in admitted scope.                                                               |
| Scheduler/Monitor  | Jobs, queues, status, cache, version           | live                    | live-only                    | yes       | yes          | no               | Keep admitted operator surfaces guarded.                                              |
| Tools/OpenForge    | OpenAPI, Export, safe OpenForge workbench      | live                    | live-only                    | yes       | yes          | no               | Direct schema/migration/business-code writes remain out of scope.                     |
| Integration        | Provider health, Mail/SMS, OAuth, design pages | live for admitted scope | live-only for admitted scope | yes       | yes          | no               | Payment/BillingDesign, full SSO and provider fleet expansion need explicit admission. |
| Collaboration      | Messages, notices, todos, approval-lite        | live                    | live-only                    | yes       | yes          | no               | BPMN/full workflow remains out of scope.                                              |

## Coverage Summary

- System/RBAC: user, role, permission, menu, dept, post, dict, config, notice
  and file have live API/SDK/Admin surfaces within admitted scope.
- Auth/session: login policy, logout, force logout, registered-token allowlist,
  revocation and expired cleanup are real behavior.
- Logs/location: login-log and operation-log include filtering, cleanup,
  retention and structured IP/location provider boundaries.
- Notice/integration: templates, outbox, provider processing, callback sync,
  retry, SMS HTTP, SMTP, OAuth token inventory and provider health audit are
  live for the admitted foundation surface.
- Monitor/tools: jobs, queues, cache, status, version, OpenAPI drift, export
  protocol and OpenForge safe workbench are live operator surfaces.
- Collaboration: message, notice, todo and approval-lite are live lightweight
  collaboration operations; full workflow is a separate domain.

## Explicit Non-Claims

Explicit user admission is still required for production multi-tenancy,
BPMN/full workflow, full report designer, big-data async export, real
payment/refund/reconciliation, CRM/ERP/MES/WMS/mall/member suites, real
external notification provider fleet and AI/RAG/Agent workflow.

## Next Work Rule

This comparison selects no next queue. New implementation work needs an
explicit finite admitted queue with API, SDK, Admin, permission/menu,
seed/migration, OpenAPI, smoke, deploy guard and docs requirements.
