# OpenCore（开元）启动设计 Handoff

更新时间：2026-06-09

## 1. 项目定位

OpenCore（中文名：开元）定位为：

> 开放之源，万物之始。AI Native 企业级全栈 Monorepo。

它不是单纯的后台管理项目，而是一套面向一人公司、小团队和现代企业应用开发的全端平台底座。

目标是在一个 monorepo 内统一管理：

```text
API 后端
官方后台 / 中台
官网
移动端
小程序
桌面端
共享契约
权限码
模块注册表
代码生成器 OpenForge
AI Native 能力预留
```

## 2. 当前仓库状态

当前已经完成 S0/S1：

```text
S0：品牌、技术栈、仓库命名、目录方向确认
S1：monorepo 骨架、workspace、Nx、基础文档、占位应用目录
```

当前阶段只完成骨架，不代表业务系统已经启动。

## 3. 技术栈最终确认

### Monorepo

```text
pnpm workspace
Nx
TypeScript
```

### 后端主线

```text
NestJS
Prisma
PostgreSQL
Redis
BullMQ
MinIO / S3
OpenAPI
```

### 官方后台主线

```text
Umi Max
Ant Design Pro V6
ProComponents v3
antd 6
React 19
```

### 其他端

```text
apps/web      Next.js 官网，后续阶段初始化
apps/mobile   Expo React Native，后续阶段初始化
apps/miniapp  Taro + React 小程序，后续阶段初始化
apps/desktop  Tauri 桌面端，后续阶段初始化
```

第一阶段只保留这些目录和 `.gitkeep`，不初始化具体项目。

## 4. 当前严格不做

启动设计阶段禁止直接做下列内容：

```text
不实现登录
不实现 RBAC
不接数据库
不写 Prisma schema
不初始化 Next.js / Expo / Taro / Tauri
不迁移 Refine
不使用 Vue
不使用 Java
不把 MUI 作为官方后台主线
不做知识库
不做 RAG
不做 Agent
不做完整工作流
不做 CRM / ERP / MES / WMS
不做商城 / 支付 / 会员
不做多租户
```

## 5. 设计阶段目标

下一阶段不是写业务代码，而是完成 OpenCore 的平台设计锁定。

建议拆成 6 个设计任务：

```text
D1：平台分层与 app/package 职责设计
D2：模块注册表与模块分层设计
D3：权限、菜单、OpenAPI 契约规范设计
D4：apps/api 启动方案设计
D5：apps/admin 启动方案设计
D6：OpenForge 代码生成器路线设计
```

## 6. 推荐设计顺序

### D1：平台分层与职责边界

输出文档：

```text
docs/architecture/platform-boundaries.md
```

必须明确：

```text
apps/api 负责什么
apps/admin 负责什么
apps/web/mobile/miniapp/desktop 什么时候启动
packages/shared 放什么
packages/contracts 放什么
packages/sdk 放什么
packages/auth 放什么
packages/module-registry 放什么
packages/ui-web 放什么
packages/ai-core 放什么
```

原则：

```text
共享业务契约，不强行共享所有 UI。
API 是唯一业务后端。
OpenAPI 是前后端契约边界。
权限码必须跨端共享。
模块注册表必须跨端共享。
```

### D2：模块注册表与模块分层

输出文档：

```text
docs/modules/module-taxonomy.md
```

模块层级：

```text
core          默认启用，企业后台基础能力
monitor       系统监控和运维能力
tool          开发工具和生成器能力
collaboration 消息、待办、轻量审批等协同能力
optional      知识库、工单、报表、工作流增强等通用可选模块
industry      工程、制造、教育等行业模块
integration   微信、短信、钉钉、飞书、支付等集成模块
ai            AI Native 能力预留
experimental  示例、实验和非主线模块
```

第一版不要实现所有模块，只设计分类和启用策略。

### D3：权限、菜单、OpenAPI 契约规范

输出文档：

```text
docs/development/contract-and-permission-standard.md
```

必须明确：

```text
Role.code 作为系统身份
Permission.code 作为权限身份
Menu key/path/permission 的对应规则
OpenAPI 生成 SDK 的流程
后端接口变更如何让前端同步
CI 如何防止 OpenAPI drift
```

### D4：apps/api 启动方案

输出文档：

```text
docs/development/api-bootstrap-plan.md
```

设计 NestJS API 的启动顺序：

```text
先初始化 NestJS 空应用
再接入 config/env validation
再接入 health/live/ready
再接入 OpenAPI
再接入 Prisma
再做 auth/RBAC
```

不要一步到位实现全部业务模块。

### D5：apps/admin 启动方案

输出文档：

```text
docs/development/admin-bootstrap-plan.md
```

设计 Umi Max + Ant Design Pro V6 的启动顺序：

```text
先初始化官方 Ant Design Pro V6 模板
锁定 React 19 / antd 6 / ProComponents v3 / Umi Max
保留模板页作为 examples/templates
建立 request / access / OpenAPI client 规范
建立路由和菜单规范
建立 E2E 基础
```

不要迁移 Refine，不把 MUI 作为官方 admin。

### D6：OpenForge 代码生成器路线

输出文档：

```text
docs/development/openforge-roadmap.md
```

生成器目标：

```text
NestJS module/controller/service/dto/entity
Prisma model 草案或 migration 提示
权限码
菜单 seed
Ant Design ProTable 页面
ModalForm / DrawerForm
ProDescriptions 详情抽屉
TableExportButton
OpenAPI regenerate 提示
E2E skeleton
文档片段
```

第一版先设计，不写生成器代码。

## 7. 近期不建议启动的端

下列 app 暂时只保留目录：

```text
apps/web
apps/mobile
apps/miniapp
apps/desktop
```

启动顺序建议：

```text
先 apps/api + apps/admin
再 apps/web
再 apps/mobile
再 apps/miniapp
最后 apps/desktop
```

理由：

```text
后台和 API 是平台主干。
官网依赖产品定位稳定。
移动端依赖核心 API 稳定。
小程序依赖轻操作场景明确。
桌面端依赖本地能力场景明确。
```

## 8. 阶段验收标准

完成启动设计阶段后，应满足：

```text
有明确平台边界文档
有模块分层文档
有权限/菜单/OpenAPI 规范文档
有 API 启动计划
有 Admin 启动计划
有 OpenForge 生成器路线
没有写业务代码
没有引入未决技术栈
```

## 9. 推荐下一步 Prompt

```text
请只执行 OpenCore D1-D6 启动设计阶段，不写业务代码。

当前仓库已经完成 S0/S1：OpenCore 品牌、monorepo 骨架、pnpm workspace、Nx 基础配置、占位应用目录和基础文档。

本阶段目标：完成平台设计锁定，为后续初始化 apps/api 和 apps/admin 做准备。

严格禁止：
- 不实现登录
- 不实现 RBAC
- 不接数据库
- 不写 Prisma schema
- 不初始化 Next.js / Expo / Taro / Tauri
- 不迁移 Refine
- 不使用 Vue
- 不使用 Java
- 不做知识库
- 不做 RAG / Agent
- 不做 CRM / ERP / MES / WMS
- 不做商城 / 支付 / 会员
- 不做多租户

请新增或更新以下文档：
1. docs/architecture/platform-boundaries.md
2. docs/modules/module-taxonomy.md
3. docs/development/contract-and-permission-standard.md
4. docs/development/api-bootstrap-plan.md
5. docs/development/admin-bootstrap-plan.md
6. docs/development/openforge-roadmap.md
7. docs/handoff/README.md

文档必须说明：
- OpenCore 的 app/package 职责边界
- core / monitor / tool / collaboration / optional / industry / integration / ai / experimental 模块分层
- 权限码、菜单、OpenAPI SDK 的同步规范
- apps/api 的 NestJS 启动顺序
- apps/admin 的 Umi Max + Ant Design Pro V6 启动顺序
- OpenForge 代码生成器第一版目标
- 为什么暂时不启动 web/mobile/miniapp/desktop

完成后输出：
- 新增/修改文档清单
- 核心架构决策
- 下一阶段 S2 建议
- 风险点
```

## 10. 下一阶段建议

启动设计阶段完成后，再进入：

```text
S2：初始化 apps/api + apps/admin 空项目
```

S2 只做可运行空应用，不做业务模块。
