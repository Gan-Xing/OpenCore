# apps/admin 启动计划

本文档定义 `apps/admin` 的 Umi Max + Ant Design Pro V6 启动顺序和当前落地状态。S2-S8 已完成，后续 Admin 变更必须继续遵守 SDK、registry、access 和 smoke test 门禁。

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

| 阶段            | 状态     | Admin 结果                                                          |
| --------------- | -------- | ------------------------------------------------------------------- |
| ADMIN-0 / S2    | complete | 初始化官方模板，接入 Nx target                                      |
| ADMIN-1 / S2    | complete | 模板 demo 隔离，正式路由不挂 demo                                   |
| ADMIN-2 / S5    | complete | `src/utils/request.ts` 统一 request、trace/request header、错误包装 |
| ADMIN-3 / S5-S8 | complete | `src/access.ts` 使用权限码，不直接写死角色名                        |
| ADMIN-4 / S5-S8 | complete | 路由和菜单由 registry / shellRegistry 派生和校验                    |
| ADMIN-5 / S6-S8 | complete | Admin 通过 `@opencore/sdk` typed client / fixtures 消费 API 和权限  |
| ADMIN-6 / S2-S8 | complete | Admin smoke test 覆盖 shell、RBAC、system、monitor/tool 路由和边界  |

## 当前正式页面

- `/dashboard`
- `/tools/openapi`
- `/tools/export`
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
- `/403`
- `/404`
- `/500`

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
```
