# OpenCore Runtime Integration Handoff：S8.5 真实运行时接入

更新时间：2026-06-10

适用模型：GPT-5.5 xhigh / Codex

## 0. 背景

OpenCore 已完成 S3-S8：

- S3 contracts / shared / module-registry
- S4 API core foundation
- S5 Admin core shell
- S6 auth / RBAC system
- S7 system management
- S8 monitor / tool baseline

当前目标不是进入 P4/P5，也不是直接做 S9 OpenForge，而是先把 S6-S8 中仍然基于 seed / in-memory / readonly baseline 的能力接入真实运行时基础设施。

本 handoff 建议路径：

```text
docs/handoff/2026-06-10-runtime-integration-handoff.md
```

## 1. 总目标

从服务器已有 NestWeb 运行环境中复用基础设施信息，给 OpenCore 单独起一套真实运行时：

```text
PostgreSQL：独立 OpenCore database / schema / user
Redis：独立 OpenCore DB index 或 key prefix
BullMQ：独立 queue prefix
MinIO/S3：独立 bucket / prefix
.env：独立 OpenCore 本地环境文件，不提交真实 secret
```

注意：可以读取 NestWeb `.env` 来识别 host、port、服务类型和可用依赖，但不能把 NestWeb 的生产 secret、token、密码写入文档、commit、日志或聊天输出。

## 2. 严格安全规则

1. 可以读取本地 `NestWeb/.env`，但只允许输出“变量名和是否存在”，不得输出真实值。
2. 不允许提交 `.env`、`.env.*`、数据库密码、Redis 密码、MinIO secret、JWT secret。
3. OpenCore 必须使用自己的 database/schema/table、Redis key prefix、queue prefix、bucket/prefix。
4. 默认不要直接连接 NestWeb 的业务库；最多复用同一台 Postgres/Redis/MinIO 服务。
5. 如果权限允许，优先创建新数据库和新用户；如果权限不足，才使用同一数据库下的新 schema。
6. 所有 destructive 操作必须 dry-run 或显式确认；不得 drop NestWeb 数据库、schema、bucket、Redis keys。
7. 文档和 progress 只记录脱敏信息，例如 `postgres host reused from NestWeb env`，不得记录密码。

## 3. 必读文件

每轮循环必须先读：

```text
docs/strategy/progress.md
docs/handoff/2026-06-10-s3-s8-implementation-handoff.md
docs/strategy/staged-roadmap.md
docs/development/api-bootstrap-plan.md
docs/development/contract-and-permission-standard.md
docs/modules/module-registry.md
docs/modules/priority-roadmap.md
README.md
```

如果本 handoff 已经提交，也必须读取：

```text
docs/handoff/2026-06-10-runtime-integration-handoff.md
```

## 4. 阶段划分

本 handoff 分为 R-1 与 R0-R7。每轮只做最早未完成阶段；每个阶段完成后必须更新 `docs/strategy/progress.md`，运行测试，commit and push，然后继续下一阶段，直到 R7 完成。

| 阶段 | 名称                             | 目标                                                                                      |
| ---- | -------------------------------- | ----------------------------------------------------------------------------------------- |
| R-1  | Legacy freeze                    | 冻结旧 Antdpro6/NestWeb 应用运行态，保留基础服务和数据卷                                  |
| R0   | Runtime audit                    | 脱敏审计 NestWeb `.env` 和服务器已有依赖，形成 OpenCore runtime plan                      |
| R1   | Env mapping                      | 扩展 `.env.example`、runtime config、runbook，生成本地 `.env.opencore.local` 模板但不提交 |
| R2   | PostgreSQL migration baseline    | 创建/确认 OpenCore 独立 DB/schema/user，接通 Prisma migrate/seed                          |
| R3   | Persistent RBAC                  | 将 S6 RBAC 从 seed repository 升级为 Prisma 持久化 repository                             |
| R4   | Persistent system management     | 将 S7 dict/config/file/log 从 in-memory 升级为 Prisma 持久化；文件仍先保留 metadata       |
| R5   | Redis/BullMQ/MinIO runtime       | 接入 Redis/BullMQ 真实只读监控 baseline；MinIO/S3 只接独立 bucket/prefix 与 file metadata |
| R6   | Integration smoke and drift gate | 用真实 runtime 跑 API/Admin/OpenAPI/SDK/Prisma smoke 和 drift check                       |
| R7   | Final docs and audit             | 同步 README/docs/handoff/progress，声明 runtime integration 完成，给出 S9 前置条件        |

## 5. R-1：Legacy freeze

### 目标

冻结旧 Antdpro6 / NestWeb 应用运行态，为 OpenCore runtime integration 释放运行时边界；基础服务、数据卷、bucket 和 network 必须保留。

### 允许

- 检查本机 `docker ps`、`ps`、`ss`、PM2 或等价运行状态。
- 精确停止旧应用运行态：
  - `antdpro6-frontend`
  - `nestweb-api`
  - 宿主机直接运行的 `/home/ubuntu/dev/NestWeb` Node 进程
- 验证 PostgreSQL、Redis、MinIO、RabbitMQ 仍在运行。
- 将冻结结果脱敏记录到 `docs/strategy/progress.md`。

### 禁止

- 不停止 PostgreSQL、Redis、MinIO、RabbitMQ，除非明确确认它只属于旧应用且不再需要。
- 不删除、不重建、不清空任何 container、volume、bucket、network 或数据库。
- 不使用宽泛 `pkill`；必须先识别精确 PID / container。
- 不输出、提交或写入文档任何真实 secret、password、token、key。

### 测试

```bash
pnpm format:check
```

### 退出条件

- 旧应用容器 `antdpro6-frontend`、`nestweb-api` 已停止。
- 宿主机直接运行的 NestWeb Node PID 已停止。
- PostgreSQL、Redis、MinIO、RabbitMQ 仍运行。
- `progress.md` 记录 R-1 完成、测试结果、下一阶段和 scope guard。

## 6. R0：Runtime audit

### 目标

识别服务器已有基础设施，确认 OpenCore 可以复用哪些 host/port/provider，但不泄漏 secret。

### 允许

- 读取本地 NestWeb `.env`。
- 输出变量名列表、服务类型、是否存在。
- 识别 PostgreSQL、Redis、MinIO/S3、RabbitMQ/BullMQ、端口、bucket 名称等。
- 新增文档：
  - `docs/runtime/runtime-inventory.md`
  - `docs/runtime/opencore-env-mapping.md`

### 禁止

- 不输出真实密码、token、secret。
- 不提交任何 `.env` 文件。
- 不连接或修改数据库。
- 不实现业务代码。

### 测试

```bash
pnpm format:check
```

### 退出条件

- 有脱敏 runtime inventory。
- 明确 OpenCore 应复用哪些服务，必须新建哪些 database/schema/bucket/prefix。
- `progress.md` 记录 R0 完成。

## 7. R1：Env mapping

### 目标

把 OpenCore runtime config 从当前基础变量扩展为真实运行所需变量。

### 允许

- 更新 `.env.example`，只写 placeholder。
- 更新 runtime config validation。
- 新增本地说明，不提交真实 `.env.opencore.local`。
- 明确变量命名，例如：

```text
DATABASE_URL
REDIS_URL
REDIS_KEY_PREFIX
BULLMQ_QUEUE_PREFIX
S3_ENDPOINT
S3_REGION
S3_BUCKET
S3_ACCESS_KEY_ID
S3_SECRET_ACCESS_KEY
S3_FORCE_PATH_STYLE
```

### 禁止

- 不写真实密钥。
- 不把 NestWeb 变量名硬编码为 OpenCore 的生产变量。
- 不接业务逻辑。

### 测试

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test:api
pnpm prisma:validate
```

### 退出条件

- `.env.example` 足够启动 OpenCore runtime。
- runtime config 对生产危险值 fail fast。
- `progress.md` 记录 R1 完成。

## 8. R2：PostgreSQL migration baseline

### 目标

用真实 PostgreSQL 为 OpenCore 建立独立数据库/schema/user 和 Prisma migration/seed 基线。

### 允许

- 新增 `prisma/migrations/**`。
- 新增 `prisma/seed.ts` 或等价 seed 脚本。
- 新增 `pnpm prisma:migrate`、`pnpm prisma:seed`、`pnpm prisma:studio` 等安全脚本。
- 用 module registry 初始化 permissions/menus。
- 用固定 bootstrap admin role code，但密码必须从本地 env 或一次性 seed 输入获取，不能写入仓库。

### 禁止

- 不读取或迁移 NestWeb 业务数据。
- 不 drop / truncate NestWeb database/schema/table。
- 不提交真实 DATABASE_URL。
- 不做多租户。

### 测试

```bash
pnpm prisma:validate
pnpm prisma:migrate
pnpm prisma:seed
pnpm test:api
pnpm typecheck
pnpm lint
```

### 退出条件

- Prisma migration 可在 OpenCore 独立 DB/schema 上执行。
- seed 可幂等运行。
- DB 中有基础 Role.code / Permission.code / Menu。
- `progress.md` 记录 R2 完成。

## 9. R3：Persistent RBAC

### 目标

将 RBAC 从 seed/in-memory 升级为 Prisma 持久化。

### 允许

- 新增 PrismaService / DatabaseModule。
- 重构 `RbacRepository` 使用 Prisma Client。
- 保留 seed fixture 只用于测试。
- 增加 repository integration tests。
- Admin 页面继续通过 SDK/权限码调用，不绕过契约。

### 禁止

- 不把角色展示名当作权限身份。
- 不破坏 `Role.code` 和 `Permission.code` 稳定性。
- 不做 SSO/OAuth2、多租户、组织数据权限。

### 测试

```bash
pnpm test:api
pnpm test
pnpm openapi:export
pnpm openapi:check
pnpm typecheck
pnpm lint
```

### 退出条件

- login/me/users/roles/permissions/menus 从 DB 读取。
- 权限 guard 使用 DB 权限码。
- seed fixtures 不再是生产路径。
- `progress.md` 记录 R3 完成。

## 10. R4：Persistent system management

### 目标

将 dict、system config、file asset、audit log、login log 从进程内数组升级到 Prisma 持久化。

### 允许

- 重构 `SystemManagementRepository` 使用 Prisma Client。
- file asset 仍只做 metadata + storageKey，不必须上传真实对象。
- 保留审计脱敏。
- 保留 current-page export preview。

### 禁止

- 不把工程图片、文章、微信、短信、邮件 provider 放进 core。
- 不做大数据异步导出。
- 不做完整 workflow。

### 测试

```bash
pnpm test:api
pnpm test
pnpm openapi:export
pnpm openapi:check
pnpm typecheck
pnpm lint
```

### 退出条件

- dict/config/file/log CRUD 从 DB 读取和写入。
- 审计脱敏测试通过。
- current-page export preview 正常。
- `progress.md` 记录 R4 完成。

## 11. R5：Redis / BullMQ / MinIO runtime

### 目标

接入真实 Redis/BullMQ/MinIO/S3 runtime boundary，但仍保持 S8 范围：只读诊断、基础 queue baseline、文件 metadata，不做完整任务平台。

### 允许

- Redis client health check。
- BullMQ queue read-only status。
- MinIO/S3 bucket/prefix health check。
- 文件资产 metadata 和 storageKey 与 bucket/prefix 对齐。
- 独立 key prefix / queue prefix / bucket prefix。

### 禁止

- 不清空 Redis。
- 不复用 NestWeb prefix。
- 不做完整调度平台。
- 不做大文件异步导出。
- 不暴露 Redis/S3 secret。

### 测试

```bash
pnpm test:api
pnpm test
pnpm typecheck
pnpm lint
pnpm openapi:export
pnpm openapi:check
```

### 退出条件

- `/monitor/status` 能显示 DB/Redis/Queue/S3 基础状态。
- `/monitor/queues` 从真实 BullMQ/Redis 或 adapter 读取只读状态。
- 不暴露敏感配置。
- `progress.md` 记录 R5 完成。

## 12. R6：Integration smoke and drift gate

### 目标

用真实 runtime 执行 API/Admin/OpenAPI/SDK smoke，确保环境可启动、契约无漂移。

### 必跑

```bash
pnpm format:check
pnpm build
pnpm test
pnpm lint
pnpm typecheck
pnpm prisma:validate
pnpm openapi:export
pnpm openapi:check
pnpm test:api
pnpm test:admin
NX_DAEMON=false pnpm nx test sdk
NX_DAEMON=false pnpm nx test contracts
```

可选 smoke：

```bash
pnpm dev:api
pnpm dev:admin
curl /health/live
curl /health/ready
curl /api/docs
curl /monitor/status
```

### 退出条件

- 全部必跑检查通过。
- OpenAPI snapshot 与 API 一致。
- Admin smoke 能访问 Dashboard/System/Security/Monitor/Tool 页面。
- `progress.md` 记录 R6 完成。

## 13. R7：Final docs and audit

### 目标

同步文档，完成 runtime integration final audit，为 S9 OpenForge MVP 做准备。

### 更新文档

- `README.md`
- `docs/README.md`
- `docs/development/getting-started.md`
- `docs/development/api-bootstrap-plan.md`
- `docs/modules/priority-roadmap.md`
- `docs/handoff/README.md`
- `docs/strategy/progress.md`
- `docs/runtime/*.md`

### 退出条件

- 文档明确：S8 complete + runtime integration complete。
- 明确：S9 OpenForge MVP 尚未开始。
- 明确：P4/P5 仍在 parity backlog。
- 所有测试证据记录在 progress。
- commit and push 完成。

## 14. Commit message 格式

每阶段提交使用中英双语：

```text
feat(runtime): connect OpenCore to isolated PostgreSQL baseline

中文：为 OpenCore 接入独立 PostgreSQL runtime 基线，保留与 NestWeb 的服务复用但隔离 database/schema/user。
English: Connect OpenCore to an isolated PostgreSQL runtime baseline while reusing infrastructure service boundaries from NestWeb.
```

## 15. 循环停止条件

只有 R-1 和 R0-R7 全部完成，且测试通过，才停止并最终汇报：

- R-1、R0-R7 完成总览
- 每阶段 commit
- 最终测试证据
- OpenCore runtime endpoint / env usage
- S9 OpenForge MVP 前置条件
- P4/P5 backlog 保留清单

如果中途遇到真实 secret、数据库权限不足、服务不可达，不要硬编码绕过；记录问题、更新 progress，并给出最小修复建议。
