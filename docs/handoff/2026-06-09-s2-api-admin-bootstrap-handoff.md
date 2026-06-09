# OpenCore S2：apps/api + apps/admin 初始化 Handoff

更新时间：2026-06-09

## 1. 阶段定位

S2 是 OpenCore 从“monorepo 骨架”进入“可运行双主干”的阶段。

本阶段只初始化两个主干应用：

```text
apps/api    NestJS API 空应用
apps/admin  Umi Max + Ant Design Pro V6 官方后台空应用
```

S2 的目标不是实现业务，而是建立后续所有模块的运行、构建、契约和工程基线。

## 2. 前置状态

当前仓库已完成：

```text
S0：品牌、技术栈、仓库命名、目录方向确认
S1：monorepo 骨架、pnpm workspace、Nx 基础配置、占位应用目录和基础文档
D1-D6：平台边界、模块分类、契约与权限规范、API 启动计划、Admin 启动计划、OpenForge 路线图
```

因此 S2 可以开始初始化 `apps/api` 和 `apps/admin`。

## 3. 技术栈锁定

### apps/api

```text
NestJS
TypeScript
Nx target
OpenAPI skeleton
health/live + health/ready
config/env validation baseline
Jest 或 Nest 默认测试基线
```

S2 不接入 Prisma/PostgreSQL/Redis/BullMQ/MinIO。

这些依赖保留在技术路线中，但从后续阶段逐步接入。

### apps/admin

```text
Umi Max
Ant Design Pro V6
ProComponents v3
antd 6
React 19
TypeScript
Playwright/Jest 测试基线
Nx target
```

S2 不接真实 API，不实现登录，不实现 RBAC。

### Monorepo

```text
pnpm workspace
Nx
Node >= 22
pnpm >= 10
```

## 4. 严格禁止

S2 严禁扩大范围：

```text
不实现登录
不实现 RBAC
不接数据库
不写 Prisma schema
不实现用户/角色/菜单/权限业务
不实现知识库
不实现 RAG / Agent
不做完整工作流
不做 CRM / ERP / MES / WMS
不做商城 / 支付 / 会员
不做多租户
不初始化 apps/web
不初始化 apps/mobile
不初始化 apps/miniapp
不初始化 apps/desktop
不迁移 Refine
不使用 Vue
不使用 Java
不把 MUI 作为官方后台主线
```

## 5. 核心原则

### 5.1 使用官方脚手架 / 生成器

S2 不建议手写模拟模板。

- `apps/api` 优先用 Nx/Nest 官方生成器生成。
- `apps/admin` 优先用 Umi / Ant Design Pro 官方模板生成。
- 如果 CLI 参数随版本变化，应先执行 `--help`，记录实际命令，再提交。

### 5.2 先本地生成，再提交

由于脚手架会生成 lockfile、配置文件和依赖，S2 最好在本地或可执行 shell 的开发环境中完成。

不要只靠手写 GitHub 文件模拟项目初始化。

### 5.3 web/mobile/miniapp/desktop 继续占位

S2 只保留以下目录和 `.gitkeep`：

```text
apps/web
apps/mobile
apps/miniapp
apps/desktop
```

不要初始化 Next.js、Expo、Taro、Tauri。

### 5.4 API 与 Admin 先可运行，再谈业务

S2 验收只看：

```text
api 能启动
api 能构建
api 有 health 和 OpenAPI skeleton
admin 能启动
admin 能构建
Nx target 能识别
workspace install 正常
```

不看业务能力。

## 6. S2-A：初始化 apps/api

### 6.1 推荐执行方式

优先使用 Nx Nest generator。

示例流程如下，实际命令以当前 Nx 版本 `--help` 为准：

```bash
pnpm add -D @nx/nest @nestjs/cli
pnpm nx g @nx/nest:application api --directory=apps/api --projectNameAndRootFormat=as-provided
```

如果 Nx generator 参数变化，应执行：

```bash
pnpm nx g @nx/nest:application --help
```

并将最终实际命令写入 `docs/development/api-bootstrap-plan.md`。

### 6.2 API 基线内容

S2 的 `apps/api` 应包含：

```text
main.ts
app.module.ts
app.controller.ts 或 health.controller.ts
health/live
health/ready
OpenAPI setup
基础测试
project.json 或 Nx target 配置
```

### 6.3 Health 约定

S2 可先实现：

```text
GET /health/live   进程存活
GET /health/ready  暂无外部依赖时返回 ready
```

后续接入数据库、Redis、队列、对象存储后再增强 readiness。

### 6.4 OpenAPI 约定

S2 只建立 OpenAPI skeleton：

```text
title: OpenCore API
version: 0.0.0
description: OpenCore API contract
```

建议后续契约输出位置：

```text
packages/contracts/openapi/opencore.openapi.json
```

S2 可以先不实现完整契约生成脚本，但必须保留设计和目录位置。

### 6.5 API 验收

```bash
pnpm nx serve api
pnpm nx build api
pnpm nx test api
```

如果 S2 暂未配置 test target，必须在完成说明中写明原因和后续处理。

## 7. S2-B：初始化 apps/admin

### 7.1 推荐执行方式

优先使用 Umi / Ant Design Pro 官方模板生成。

建议不要在 monorepo 根目录直接生成，避免覆盖根配置。

推荐流程：

```text
1. 在临时目录生成官方 Ant Design Pro V6 项目。
2. 确认 React 19 / antd 6 / ProComponents v3 / Umi Max 版本线。
3. 将生成结果迁入 apps/admin。
4. 调整 package.json、tsconfig、Nx target，使其适配 monorepo。
5. 保留官方模板页，但与后续正式业务路由隔离。
```

具体 CLI 命令以官方脚手架当前版本为准，执行时必须记录实际命令。

### 7.2 Admin 基线内容

S2 的 `apps/admin` 应包含：

```text
Umi Max 项目配置
Ant Design Pro V6 基础布局
ProComponents v3 依赖
antd 6 依赖
React 19 依赖
基础页面和模板页
基础测试或 smoke test
project.json 或 Nx target 配置
```

### 7.3 模板页策略

Ant Design Pro 模板页不要直接删掉。

建议：

```text
保留模板页作为 examples/templates 或等价区域
默认正式路由保持干净
模板页用于后续 OpenForge 生成器参考
```

S2 只要求“边界清楚”，不要求重构全部模板页。

### 7.4 Request / Access / SDK 预留

S2 不实现真实登录和 RBAC，但要保留结构位置：

```text
src/app.tsx
src/access.ts
src/services 或 packages/sdk 消费入口
src/utils/request
```

原则：

```text
页面不直接手写裸 API URL
后续只通过 SDK 或统一 request 调接口
access 只依赖 Permission.code，不直接判断角色显示名
```

### 7.5 Admin 验收

```bash
pnpm nx serve admin
pnpm nx build admin
pnpm nx test admin
pnpm nx typecheck admin
```

如果某些 target 暂未配置，必须在完成说明中写明原因和后续处理。

## 8. 根 workspace 调整

S2 允许更新：

```text
package.json
pnpm-lock.yaml
nx.json
tsconfig.base.json
pnpm-workspace.yaml
apps/api/project.json
apps/admin/project.json
```

建议新增根 scripts：

```json
{
  "dev:api": "nx serve api",
  "dev:admin": "nx serve admin",
  "build:api": "nx build api",
  "build:admin": "nx build admin",
  "test:api": "nx test api",
  "test:admin": "nx test admin",
  "typecheck": "nx run-many -t typecheck"
}
```

实际 scripts 以最终 Nx target 为准。

## 9. packages 的处理

S2 不要求完整实现 packages，但建议保留最小 package 边界：

```text
packages/shared        权限码、枚举、通用类型，S2 可为空
packages/contracts     OpenAPI 契约产物目录，S2 可为空
packages/sdk           生成 SDK 目录，S2 可为空
packages/config        共享 tsconfig/eslint/env 规范，S2 可先只放文档或基础配置
packages/module-registry 模块注册表，S2 可先只放类型草案
packages/ui-web        Web 通用组件，S2 可为空
packages/testing       测试工具，S2 可为空
packages/ai-core       AI Native 能力边界预留，S2 可为空
```

不要为了填满 packages 而写未验证的业务抽象。

## 10. 文档更新要求

S2 完成后必须更新：

```text
README.md
docs/development/getting-started.md
docs/development/api-bootstrap-plan.md
docs/development/admin-bootstrap-plan.md
docs/handoff/README.md
```

如果实际 CLI 命令与 handoff 示例不同，必须写入实际执行命令。

## 11. 推荐执行 Prompt

```text
请只执行 OpenCore S2：初始化 apps/api 和 apps/admin 空项目。

当前仓库已经完成 S0/S1/D1-D6：品牌、monorepo 骨架、pnpm workspace、Nx 基础配置、占位应用目录、平台设计文档。

本阶段目标：创建可运行的 NestJS API 空应用和 Umi Max + Ant Design Pro V6 官方后台空应用，并接入 pnpm workspace + Nx target。

严格禁止：
- 不实现登录
- 不实现 RBAC
- 不接数据库
- 不写 Prisma schema
- 不写业务模块
- 不初始化 apps/web / apps/mobile / apps/miniapp / apps/desktop
- 不迁移 Refine
- 不使用 Vue
- 不使用 Java
- 不使用 MUI 作为官方 admin
- 不做知识库
- 不做 RAG / Agent
- 不做 CRM / ERP / MES / WMS
- 不做商城 / 支付 / 会员
- 不做多租户

要求：
1. apps/api 使用 NestJS。
2. apps/api 接入 health/live、health/ready 和 OpenAPI skeleton。
3. apps/admin 使用 Umi Max + Ant Design Pro V6 + ProComponents v3 + antd 6 + React 19。
4. 所有依赖通过 pnpm 安装。
5. 保持 Nx 可识别 api/admin 项目。
6. 增加或确认根 scripts：dev:api、dev:admin、build:api、build:admin、test:api、test:admin。
7. apps/web/mobile/miniapp/desktop 继续只保留 .gitkeep。
8. 更新 README.md 和相关 docs。

优先使用官方脚手架或 Nx generator 生成，不要手写模拟模板文件。
如果 CLI 参数变化，先执行 --help，记录实际命令，再继续。

完成后输出：
- 执行过的命令
- 新增/修改文件清单
- 项目结构树
- 本地启动命令
- 验收命令
- 未配置 target 的原因
- 风险点
```

## 12. 风险点

### 12.1 脚手架覆盖根配置

Ant Design Pro 模板不要直接在仓库根目录生成。

建议先临时目录生成，再迁入 `apps/admin`。

### 12.2 Nx target 与脚手架 package scripts 不一致

必须让 `nx serve admin`、`nx build admin` 能调用实际的 Umi 命令。

### 12.3 版本漂移

S2 必须锁定官方后台版本线：

```text
Umi Max
Ant Design Pro V6
ProComponents v3
antd 6
React 19
```

不要被旧模板带回 antd 5 或 React 18。

### 12.4 过早实现业务

S2 如果开始做登录、RBAC 或数据库，会导致后续权限、菜单、OpenAPI 规范返工。

## 13. S2 完成后的下一阶段

S2 完成后建议进入：

```text
S3：contracts/shared/module-registry 基线
```

S3 再设计：

```text
权限码常量
模块注册表类型
OpenAPI 输出与 SDK 生成链路
基础 CI
```

仍不急着实现完整登录和 RBAC。
