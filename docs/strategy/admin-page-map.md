# Admin Page Map

更新时间：2026-06-15

`apps/admin` 的当前事实来源是 `apps/admin/config/routes.ts`、`packages/module-registry` 和 OpenAPI/SDK。本文只记录当前正式 Admin 页面、菜单分组和产品化状态，不再作为 S10/S12 预测路线图。

## 当前 Admin 架构口径

- UI stack：Umi Max + Ant Design Pro V6 + ProComponents + React。
- 数据来源：正式页面通过 `@opencore/sdk`、OpenAPI、模块注册表和权限码消费后端；不得静默回退到 fixture。
- 权限来源：`Permission.code`，格式遵循 `<module>:<resource>:<action>`。
- 路由事实：以 `apps/admin/config/routes.ts` 为准。
- 部署事实：固定 Admin 端口 `39174`，代码改动必须走 `pnpm deploy:opencore` 和 public Admin smoke。

## 当前一级菜单

| 一级菜单      | 当前页面                                                                      | 产品化状态                                                                          |
| ------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Dashboard     | `/dashboard`                                                                  | live summary/shell                                                                  |
| Personal      | `/personal/profile`                                                           | live profile/password/avatar                                                        |
| System        | users、roles、permissions、menus、dicts、config、notices、depts、posts、files | Cycle-021 fixed pages live-only；dicts/depts/menus 等已去 fixture                   |
| Security      | login logs、operation logs                                                    | live-only Admin, server-side filters and smoke guards                               |
| Monitor       | status、version、queues、jobs、cache、online users                            | live runtime/operator surfaces with deploy guards                                   |
| Tools         | OpenAPI、Export、Area Data、OpenForge                                         | live protocol/drift/area-boundary/safe workbench surfaces                           |
| Collaboration | messages、notices、todos、approvals                                           | admitted lightweight collaboration live operations                                  |
| Optional      | reports、export jobs                                                          | design/admitted surface only, full designer/executor needs explicit admission       |
| Integrations  | providers、mail、sms、oauth、wechat、websocket、billing design                | admitted provider/design/token/template surfaces; real payment remains out of scope |
| Exceptions    | `/403`、`/404`、`/500`                                                        | formal exception pages                                                              |

## 当前页面清单

| 分组          | 路径                           | 能力归属                            | 状态                                                                           |
| ------------- | ------------------------------ | ----------------------------------- | ------------------------------------------------------------------------------ |
| Dashboard     | `/dashboard`                   | `core.dashboard` / `monitor.status` | 当前正式入口                                                                   |
| Personal      | `/personal/profile`            | `core.profile`                      | live profile/password/avatar                                                   |
| System        | `/system/users`                | `core.user`                         | Cycle-021 Meets, Admin live-only                                               |
| System        | `/system/roles`                | `core.role`                         | Cycle-021 Meets, Admin live-only                                               |
| System        | `/system/permissions`          | `core.permission`                   | Cycle-021 Meets, Admin live-only                                               |
| System        | `/system/menus`                | `core.menu`                         | live-only menu tree/detail CRUD/export                                         |
| System        | `/system/dicts`                | `core.dict`                         | live-only dictionary/item operations                                           |
| System        | `/system/config`               | `core.config`                       | Cycle-021 Meets, Admin live-only                                               |
| System        | `/system/notices`              | `core.notice`                       | Cycle-021 Meets, Admin live-only                                               |
| System        | `/system/depts`                | `core.dept`                         | live-only tree/detail/order operations                                         |
| System        | `/system/posts`                | `core.post`                         | Cycle-021 Meets, Admin live-only                                               |
| System        | `/system/files`                | `core.file`                         | Cycle-021 Meets, Admin live-only                                               |
| Security      | `/security/login-logs`         | `core.login-log`                    | live-only security log page                                                    |
| Security      | `/security/operation-logs`     | `core.audit-log`                    | live-only filters/detail/export                                                |
| Monitor       | `/monitor/status`              | `monitor.status`                    | live dependency/resource status                                                |
| Monitor       | `/monitor/version`             | `monitor.version`                   | live runtime/deployment metadata                                               |
| Monitor       | `/monitor/queues`              | `monitor.queue`                     | live metrics and pause/resume controls                                         |
| Monitor       | `/monitor/jobs`                | `monitor.job`                       | live scheduler/job operations                                                  |
| Monitor       | `/monitor/cache`               | `monitor.cache`                     | live Redis namespace/key operations                                            |
| Monitor       | `/monitor/online-users`        | `monitor.online-user`               | live session list/detail/kick-out                                              |
| Tools         | `/tools/openapi`               | `tool.openapi`                      | live drift snapshot metadata                                                   |
| Tools         | `/tools/export`                | `tool.export`                       | live export protocol/preview                                                   |
| Tools         | `/tools/area`                  | `tool.area`                         | live area dataset version/query/import and IP boundary lookup                  |
| Tools         | `/tools/openforge`             | `tool.openforge`                    | live safe dry-run workbench                                                    |
| Collaboration | `/collaboration/messages`      | `collaboration.message`             | live message lifecycle                                                         |
| Collaboration | `/collaboration/notices`       | `collaboration.notice`              | live collaboration notice lifecycle                                            |
| Collaboration | `/collaboration/todos`         | `collaboration.todo`                | live todo lifecycle                                                            |
| Collaboration | `/collaboration/approvals`     | `collaboration.approval-lite`       | live single-step approval lifecycle                                            |
| Optional      | `/optional/reports`            | `optional.report`                   | admitted design surface; full designer out of scope                            |
| Optional      | `/optional/export-jobs`        | `optional.export-job`               | admitted design surface; big-data async executor out of scope                  |
| Integrations  | `/integrations/providers`      | `integration.provider`              | live health/config audit                                                       |
| Integrations  | `/integrations/mail`           | `integration.mail`                  | live template/outbox operations                                                |
| Integrations  | `/integrations/sms`            | `integration.sms`                   | live template/outbox operations                                                |
| Integrations  | `/integrations/oauth`          | `integration.oauth`                 | live token inventory/detail/revoke                                             |
| Integrations  | `/integrations/wechat`         | `integration.wechat`                | live design read, not real official-account flow                               |
| Integrations  | `/integrations/websocket`      | `integration.websocket`             | live runtime diagnostics, connection stream, subscription routing; not IM chat |
| Integrations  | `/integrations/billing-design` | `integration.billing-design`        | design boundary only, not real payment                                         |
| Exceptions    | `/403`                         | none                                | formal exception page                                                          |
| Exceptions    | `/404`                         | none                                | formal exception page                                                          |
| Exceptions    | `/500`                         | none                                | formal exception page                                                          |

## 验收规则

- Page exists is not enough. A page reaches productization waterline only when API, SDK, Admin, permission/menu, seed/migration, OpenAPI, local smoke, public API smoke, public Admin smoke and deploy guard all match its admitted scope.
- Admin fixture fallback disqualifies `Meets`.
- Bundle marker smoke is useful but cannot replace real public API/Admin smoke.
- Optional/Integration design pages must label their admitted scope clearly; design-only pages do not imply real provider/payment/workflow completion.

## 不在本文推进的内容

本文不准入 CRM、ERP、MES、WMS、mall、member、生产多租户、真实支付、完整 BPMN/full workflow、完整报表设计器、大数据异步导出、AI/RAG/Agent 或 OpenForge direct schema/migration/business-code writes。
