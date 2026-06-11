# apps/admin 启动计划

本文档定义 `apps/admin` 的 Umi Max + Ant Design Pro V6 启动顺序和当前落地状态。S2-S8、Q001 页面扩展和 2026-06-11 Pro V6 架构迁移已完成，后续 Admin 变更必须继续遵守 SDK、registry、access、OpenAPI drift 和 smoke test 门禁。

## 官方主线

`apps/admin` 固定使用：

- Umi Max。
- Ant Design Pro V6。
- ProComponents v3。
- antd 6。
- React 19。

明确不做：

- 不迁移到 Refine。
- 不使用 Vue。
- 官方 admin 不使用 MUI。
- 不直接挂载 P4/P5 业务页面。

## 当前状态

| 阶段                 | 状态     | Admin 结果                                                                                                         |
| -------------------- | -------- | ------------------------------------------------------------------------------------------------------------------ |
| ADMIN-0 / S2         | complete | 初始化官方模板，接入 Nx target                                                                                     |
| ADMIN-1 / S2         | complete | 模板 demo 隔离，正式路由不挂 demo                                                                                  |
| ADMIN-2 / S5         | complete | `src/utils/request.ts` 统一 request、trace/request header、错误包装                                                |
| ADMIN-3 / S5-S8      | complete | `src/access.ts` 使用权限码，不直接写死角色名                                                                       |
| ADMIN-4 / S5-S8      | complete | 路由和菜单由 registry / shellRegistry 派生和校验                                                                   |
| ADMIN-5 / S6-S8      | complete | Admin 通过 `@opencore/sdk` typed client / fixtures 消费 API 和权限                                                 |
| ADMIN-6 / S2-S8      | complete | Admin smoke test 覆盖 shell、RBAC、system、monitor/tool 路由和边界                                                 |
| ADMIN-7 / 2026-06-11 | complete | 采用官方 Pro V6 `config/config.ts` + `config/routes.ts`，迁移 main 业务页面，删除 demo routes/pages/services/mocks |

## 当前正式页面

- `/dashboard`
- `/system/users`
- `/system/roles`
- `/system/permissions`
- `/system/menus`
- `/system/dicts`
- `/system/config`
- `/system/files`
- `/security/login-logs`
- `/security/operation-logs`
- `/monitor/status`
- `/monitor/version`
- `/monitor/queues`
- `/monitor/jobs`
- `/monitor/cache`
- `/monitor/online-users`
- `/tools/openapi`
- `/tools/export`
- `/tools/openforge`
- `/collaboration/messages`
- `/collaboration/notices`
- `/collaboration/todos`
- `/collaboration/approvals`
- `/optional/reports`
- `/optional/export-jobs`
- `/integrations/providers`
- `/integrations/mail`
- `/integrations/sms`
- `/integrations/oauth`
- `/integrations/wechat`
- `/integrations/websocket`
- `/integrations/billing-design`
- `/user/login`
- `/403`
- `/404`
- `/500`

根路径 `/` 重定向到 `/dashboard`；catch-all 路由进入 `/404` 页面。

## 认证与请求

- 登录：`POST /api/auth/login`。
- 当前用户：`GET /api/auth/me`。
- token：`localStorage` key `opencore.admin.token`。
- 请求头：`Authorization: Bearer <token>`、`x-request-id`、`x-trace-id`。
- 401：跳转 `/user/login?redirect=...`。
- 403：跳转 `/403`。
- API 错误：进入 `src/requestErrorConfig.ts`。

## 已删除 Demo Surface

- Routes/pages：`/welcome`、`/admin`、`/form/*`、`/list/*`、`/profile/*`、`/result/*`、`/account/*`、`/chatbot`、`/user/register`、`/user/register-result`。
- Services/mocks/config：`src/services/ant-design-pro/**`、`apps/admin/mock/**`、`config/oneapi.json`、`config/routes.simple.ts`、`pro-api.ant-design-demo`、`preview.pro.ant.design`。

## 权限模型

所有正式路由继续通过 `src/access.ts` 使用 `Permission.code` 判断，不使用 role name 或 `canAdmin`。`pnpm registry:admin-routes:check` 会解析 `apps/admin/config/routes.ts`，并与 `packages/module-registry` 的 `admin.routes[].permissionCode` 对齐。

## 当前非目标

- 不挂载 CRM、ERP、MES、WMS、商城、支付、会员、多租户页面。
- 不实现知识库、RAG、Agent 页面。
- 不保留污染正式菜单的模板 demo。
- 不绕过 SDK 手写漂移 API 类型。

## 推荐检查

```bash
pnpm build:admin
pnpm test:admin
pnpm typecheck
pnpm lint
pnpm registry:admin-routes:check
pnpm openapi:check
```
