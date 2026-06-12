# cycle-021 Round 9 core.config Completion Report

Date: 2026-06-12

## Scope

Round 9 productized `core.config` as the next cycle-021 System slice. The
accepted loop is OpenCore's current system configuration model with stable
`SystemConfig.key`, `valueType`, `visibility`, secret-key enforcement and
redaction. This round also codifies the local fixed-port smoke/deploy path so
future code changes can be deployed without manual port selection.

## Completed

- Config detail API contract and repository support.
- SDK config detail method and tests.
- Live Admin Config page with list, detail, current-page export, create,
  update and delete actions.
- Secret redaction preservation in Admin list/detail/edit flows.
- Admin platform service wrappers for config list/detail/create/update/delete.
- Admin smoke coverage for SDK-backed config lifecycle usage, secret-preserving
  edit behavior, bounded filtering and current-page export behavior.
- Fixed-port local API smoke command on `39173`.
- Fixed-port local deploy command on API `39172` and Admin `39174`.
- Stable Admin production builds using webpack, with utoopack disabled for
  OpenCore deploys and Umi webpack helper conflicts addressed.
- OpenAPI snapshot and registry route/tag drift checks refreshed.

## Verification

- Focused system/sdk/api/admin typecheck passed.
- Focused system/sdk/api tests passed.
- Admin smoke/tests passed.
- OpenAPI export/check, registry tag check, registry Admin route check and SDK
  check passed.
- Script syntax checks passed for local smoke, deploy, config smoke and Admin
  static serving.
- Full gates passed: format, lint, typecheck, test, build, Prisma validate,
  API tests, contracts/module-registry/sdk tests, OpenAPI checks, registry
  Admin route check, Admin smoke, SDK check and fixed-port local API smoke.
- Admin build passed with webpack and generated the `/system/config` static
  route.
- Fixed-port HTTP smoke against `39173` passed the live, ready, docs, login,
  list, create config, detail, update, export preview, create secret, detail
  secret redaction and cleanup sequence.

## Explicitly Not Included

- Config cache refresh.
- Public get-value-by-key endpoints.
- Batch config delete.
- Excel file export workflows.
- Category/name/remark schema expansion.
- Secret vault or KMS integration.
- Runtime feature-flag propagation.
- Any CRM/ERP/MES/WMS/mall/member/pay/AI capability.

## Commit Record

- Feature commit:
  `2dbf5aa feat(core-config): productize config management and deploy path / 产品化系统参数管理与部署路径`.
- Push: `origin/main`.
