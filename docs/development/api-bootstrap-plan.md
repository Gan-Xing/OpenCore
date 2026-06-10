# apps/api 启动计划

本文档定义 `apps/api` 的 NestJS 启动顺序和当前落地状态。S2-S8 已完成，后续 API 变更必须继续遵守契约、权限、OpenAPI 和测试门禁。

## 当前状态

| 阶段          | 状态     | API 结果                                                                     |
| ------------- | -------- | ---------------------------------------------------------------------------- |
| API-0 / S2    | complete | 初始化 NestJS 应用，接入 Nx target                                           |
| API-1 / S4    | complete | config/env validation，生产危险配置 fail fast                                |
| API-2 / S2/S4 | complete | `/health/live`、`/health/ready`，返回 version、uptime、process/config checks |
| API-3 / S4-S8 | complete | OpenAPI export baseline、OpenAPI snapshot、OpenAPI drift check               |
| API-4 / S4    | complete | 统一错误、request id / trace id、结构化日志、安全 headers/CORS               |
| API-5 / S6    | complete | Prisma/PostgreSQL schema，User/Role/Permission/Menu                          |
| API-6 / S8    | partial  | queue 只读诊断已完成；Redis/BullMQ/MinIO/S3 provider 深接入后续继续          |
| API-7 / S6    | complete | auth/RBAC 最小闭环、permission decorator、global permission guard            |
| API-8 / S7    | complete | dict、system config、file asset、audit log、login log                        |
| API-9 / S8    | complete | status/version/queue、tool/openapi、tool/export protocol                     |

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
```

当前 schema 覆盖：

- User / Role / Permission / Menu。
- UserRole / RolePermission。
- DictType / DictItem。
- SystemConfig。
- FileAsset。
- AuditLog。
- LoginLog。

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
pnpm openapi:export
pnpm openapi:check
```
