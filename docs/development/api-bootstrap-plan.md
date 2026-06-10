# apps/api 启动计划

本文档定义 `apps/api` 的 NestJS 启动顺序和当前落地状态。S2-S8 与 runtime integration R-1-R7 已完成，后续 API 变更必须继续遵守契约、权限、OpenAPI、runtime isolation 和测试门禁。

## 当前状态

| 阶段             | 状态     | API 结果                                                                                           |
| ---------------- | -------- | -------------------------------------------------------------------------------------------------- |
| API-0 / S2       | complete | 初始化 NestJS 应用，接入 Nx target                                                                 |
| API-1 / S4       | complete | config/env validation，生产危险配置 fail fast                                                      |
| API-2 / S2/S4    | complete | `/health/live`、`/health/ready`，返回 version、uptime、process/config checks                       |
| API-3 / S4-S8    | complete | OpenAPI export baseline、OpenAPI snapshot、OpenAPI drift check                                     |
| API-4 / S4       | complete | 统一错误、request id / trace id、结构化日志、安全 headers/CORS                                     |
| API-5 / S6/R2/R3 | complete | Prisma/PostgreSQL schema，User/Role/Permission/Menu，OpenCore migration/seed 和 Prisma-backed RBAC |
| API-6 / S8/R5/R6 | complete | PostgreSQL、Redis、BullMQ、MinIO/S3 runtime diagnostics 与 queue 只读诊断                          |
| API-7 / S6       | complete | auth/RBAC 最小闭环、permission decorator、global permission guard                                  |
| API-8 / S7/R4    | complete | dict、system config、file asset、audit log、login log，Prisma-backed persistence                   |
| API-9 / S8       | complete | status/version/queue、tool/openapi、tool/export protocol                                           |

## 当前 API 模块

- `app/health.controller.ts`
- `platform/config`
- `platform/request-context`
- `platform/errors`
- `platform/logging`
- `platform/security`
- `platform/openapi`
- `modules/core/rbac`
- `modules/core/system-management`
- `modules/monitor/monitoring`
- `modules/tool/tooling`

## OpenAPI

当前命令：

```bash
pnpm openapi:export
pnpm openapi:check
```

OpenAPI snapshot 保存到：

```text
packages/contracts/openapi/opencore-api.json
```

## Prisma

当前命令：

```bash
pnpm prisma:validate
pnpm prisma:migrate
pnpm prisma:seed
```

当前 schema 覆盖：

- User / Role / Permission / Menu。
- UserRole / RolePermission。
- DictType / DictItem。
- SystemConfig。
- FileAsset。
- AuditLog。
- LoginLog。

## Runtime Boundary

R-1 到 R7 已完成真实 runtime integration：

- Legacy Antdpro6 / NestWeb app runtime 已冻结，PostgreSQL、Redis、MinIO、RabbitMQ 等基础服务和数据卷保留。
- OpenCore 使用独立 PostgreSQL database/user/schema boundary，并通过 Prisma baseline migration + seed 验证。
- RBAC 与 system management repository 已切换为 Prisma-backed persistence。
- Redis/BullMQ 使用 OpenCore-owned prefix/DB boundary；Monitor 只读诊断队列状态。
- MinIO/S3 使用 OpenCore-owned bucket/prefix；文件 metadata storageKey 使用 OpenCore `runtime/` prefix。
- `.env.opencore.local` 只用于本地 OpenCore runtime，保持 ignored；文档和提交只允许记录变量名和占位符。

## 当前非目标

- 不实现多租户、组织数据权限、SSO/OAuth2。
- 不实现 CRM、ERP、MES、WMS、商城、支付、会员。
- 不实现知识库、RAG、Agent。
- 不做完整任务调度平台、大数据异步导出或 OpenForge 写文件生成器。
- 不把微信、短信、邮件 provider 放进 core。

## 推荐检查

```bash
pnpm build:api
pnpm test:api
pnpm lint
pnpm typecheck
pnpm prisma:validate
pnpm prisma:migrate
pnpm prisma:seed
pnpm openapi:export
pnpm openapi:check
pnpm test:admin
NX_DAEMON=false pnpm nx test sdk
NX_DAEMON=false pnpm nx test contracts
```
