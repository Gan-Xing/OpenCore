# OpenCore（开元）Monorepo 启动 Handoff

更新时间：2026-06-09  
适用阶段：新项目启动 / Monorepo 骨架 / 技术栈冻结  
产品名：**OpenCore**  
中文名：**开元**  
理念：**开放之源，万物之始**  
定位：**AI Native 企业级全栈 Monorepo**

---

## 0. 命名确认

### 0.1 最终命名

```text
产品名：OpenCore
中文名：开元
仓库名：opencore
npm scope：@opencore（发布前需核验可用性）
代码生成器：OpenForge
```

### 0.2 品牌解释

`OpenCore` 不是“普通后台模板”，而是一个面向一人公司、小团队、AI Native 企业应用开发的全端技术底座。

中文名 **开元** 的含义：

```text
开：开放、开启、开源、开创
元：源头、本原、基础、万物之始
```

品牌语：

```text
OpenCore：开放之源，万物之始。
OpenCore：AI Native 企业级全栈 Monorepo。
```

英文定位：

```text
OpenCore is an AI-native full-stack enterprise monorepo for solo founders and modern teams.
```

中文定位：

```text
OpenCore 是面向一人公司和现代团队的 AI Native 企业级全栈 Monorepo，
一套代码库统一管理 API、后台中台、官网、移动端、小程序、桌面端、共享契约、模块注册和代码生成器。
```

### 0.3 命名风险

`OpenCore` 也可能被理解为 “open-core business model”。因此文档中必须持续强调：

```text
OpenCore = 开放式企业应用核心底座
不是某种商业授权模式
不是只做开源核心 + 商业插件
```

正式开源前需要核验：

```text
GitHub 组织名 / 仓库名
npm scope
域名
商标或同名项目冲突
```

---

## 1. 项目目标

OpenCore 目标不是重写 NestWeb + Antdpro6，也不是简单复刻 RuoYi / Yudao。

OpenCore 的目标是：

```text
用 TypeScript / Node.js / React 构建一套 AI Native 企业级全栈全端平台。
```

它应该具备：

```text
1. 企业后台中台
2. API 服务
3. 官网/文档站
4. iOS / Android 移动端
5. 小程序端
6. 桌面端
7. 共享权限码
8. 共享 OpenAPI SDK
9. 模块注册表
10. 代码生成器
11. AI Native 能力预留
12. 可选业务模块体系
```

当前阶段只启动骨架，不写业务代码。

---

## 2. 技术栈最终确认

### 2.1 Monorepo

```text
包管理：pnpm workspace
任务编排：Nx
```

选择原因：

```text
- pnpm workspace 负责本地包依赖和 workspace 管理。
- Nx 负责项目图、缓存、affected build/test、模块边界、生成器和 CI 编排。
- 当前目标包含 NestJS、Umi、Next.js、Expo、Taro、Tauri、多 packages 和代码生成器，Nx 比纯 Turborepo 更适合长期治理。
```

### 2.2 后端

```text
NestJS
Prisma
PostgreSQL
Redis
BullMQ
MinIO / S3
OpenAPI
Jest
Docker Compose
```

后端原则：

```text
- apps/api 是唯一业务后端。
- 所有端通过 API / OpenAPI SDK 访问业务能力。
- 不让 mobile / miniapp / desktop 各自写业务后端。
```

### 2.3 官方后台 / 中台

```text
Umi Max
Ant Design Pro V6
ProComponents v3
antd 6
React 19
TypeScript
Playwright
```

原则：

```text
- 官方 admin 不切 Refine。
- 官方 admin 不使用 MUI。
- 官方 admin 不从零拼 Vite 后台。
- Ant Design Pro V6 是官方企业后台工程基座。
- ProComponents 是核心生产力组件，不删除。
```

### 2.4 官网

```text
Next.js
```

用途：

```text
官网
文档入口
SEO
公开帮助中心
产品介绍
登录入口
```

第一阶段只创建目录，不初始化项目。

### 2.5 移动端

```text
Expo React Native
```

用途：

```text
iOS
Android
消息
待办
审批
个人中心
轻量业务操作
```

第一阶段只创建目录，不初始化项目。

### 2.6 小程序

```text
Taro + React
```

说明：

```text
小程序不直接使用 React Native。
微信/支付宝/字节/飞书等小程序统一走 Taro + React。
```

第一阶段只创建目录，不初始化项目。

### 2.7 桌面端

```text
Tauri
```

用途：

```text
桌面壳
本地文件能力
桌面通知
系统托盘
内部工具
```

第一阶段只创建目录，不初始化项目。

### 2.8 AI Native

AI Native 不等于第一阶段就做 RAG / Agent / 知识库代码。

当前只做架构预留：

```text
packages/ai-core
docs/ai
tools/generator 为 AI/Codex/opencode 友好的代码生成预留
模块注册表中预留 ai / knowledge / agent 分类
```

第一阶段不实现 AI 业务代码。

---

## 3. 第一阶段目录结构

```text
opencore/
  apps/
    api/
    admin/
    web/.gitkeep
    mobile/.gitkeep
    miniapp/.gitkeep
    desktop/.gitkeep

  packages/
    shared/
    contracts/
    sdk/
    auth/
    config/
    module-registry/
    ui-web/
    design-tokens/
    i18n/
    testing/
    ai-core/

  tools/
    generator/
    scripts/

  infra/
    docker/
    nginx/
    monitoring/
    k8s/

  docs/
    architecture/
    modules/
    development/
    deployment/
    runbook/
    ai/

  nx.json
  pnpm-workspace.yaml
  package.json
  tsconfig.base.json
  .gitignore
  README.md
```

### 3.1 第一阶段真正落地的 app

第一阶段只真正规划和启动：

```text
apps/api
apps/admin
```

### 3.2 第一阶段只占位的 app

以下只创建目录和 `.gitkeep`：

```text
apps/web
apps/mobile
apps/miniapp
apps/desktop
```

不要在第一阶段初始化 Next.js、Expo、Taro、Tauri。

---

## 4. packages 职责

### packages/shared

共享：

```text
权限码
模块 key
枚举
基础类型
业务常量
状态码
```

### packages/contracts

共享契约：

```text
OpenAPI schema
DTO 草案
Zod schema 可选
API contract 文档
```

### packages/sdk

生成 SDK：

```text
由 apps/api 的 OpenAPI 生成
供 apps/admin / web / mobile / miniapp / desktop 调用
```

### packages/auth

共享：

```text
权限判断
token helpers
session 类型
access helpers
```

### packages/config

统一工程配置：

```text
eslint 或 biome
prettier
tsconfig
env schema
commitlint 可选
```

### packages/module-registry

模块注册表：

```text
core
monitor
tool
collaboration
optional
industry
integration
ai
experimental
```

每个模块记录：

```text
moduleKey
名称
层级
默认启用
权限码
菜单
后端模块
前端页面
依赖环境变量
E2E 级别
文档入口
```

### packages/ui-web

Web 后台通用组件：

```text
PermissionButton
TableExportButton
StatusTag
DetailDrawer
FormSection
PageHeader
```

基于 Ant Design / ProComponents 封装。

### packages/design-tokens

跨端设计 token：

```text
colors
spacing
typography
radius
shadow
```

注意：共享 token，不强行共享 UI 组件。

### packages/i18n

国际化资源：

```text
zh-CN
en-US
fr-FR 可选
```

### packages/testing

共享测试工具：

```text
fixtures
mock users
e2e helpers
seed helpers
```

### packages/ai-core

AI Native 预留包：

```text
prompt contracts
tool schemas
model provider interface
agent runtime interface
evaluation types
```

第一阶段只占位，不写具体 AI 业务。

---

## 5. apps 职责

### apps/api

OpenCore API。

职责：

```text
业务后端
认证授权
RBAC
OpenAPI
数据库访问
队列
文件存储
审计日志
模块 API
```

### apps/admin

OpenCore Admin。

职责：

```text
企业后台 / 中台
完整管理能力
ProTable / ProForm / ProDescriptions
Dashboard
系统管理
模块管理
开发工具
```

### apps/web

官网 / 文档入口。

第一阶段占位。

### apps/mobile

iOS / Android。

第一阶段占位。

### apps/miniapp

小程序。

第一阶段占位。

### apps/desktop

桌面端。

第一阶段占位。

---

## 6. 模块分层

### core

默认启用，企业后台基础能力：

```text
auth
user
role
permission
menu
dashboard
dict
config
file
audit
login-log
profile
```

### monitor

运维监控：

```text
system-status
system-version
queue-monitor
cache-monitor
online-session
job-monitor
```

### tool

系统工具：

```text
openapi
code-generator
table-export
i18n-check
module-registry
```

### collaboration

协同能力：

```text
message-center
todo
approval-lite
notification
```

### optional

通用可选模块：

```text
knowledge-base
ticket
report-center
workflow-lite
form-builder
```

### industry

行业模块：

```text
engineering-images
equipment
material
inspection
```

### integration

集成模块：

```text
wechat
sms
dingtalk
feishu
payment
email-provider
```

### ai

AI Native 模块：

```text
ai-assistant
knowledge-rag
agent-tools
prompt-center
evaluation
```

### experimental

实验 / 示例模块：

```text
demo-articles
demo-crud
template-pages
```

---

## 7. 与 RuoYi / Yudao 的关系

OpenCore 学习 RuoYi / Yudao 的：

```text
模块地图
菜单组织
权限粒度
精简版 / 完整版思路
系统管理 / 系统监控 / 系统工具分层
代码生成器
演示数据
文档完整度
```

不复制：

```text
Java 代码
Vue 代码
数据库结构
业务实现
UI 实现
```

OpenCore 是：

```text
TS / Node / React 版 AI Native 企业级全栈 Monorepo。
```

不是 RuoYi/Yudao 的翻译版。

---

## 8. 开发阶段路线

### S0：命名与架构冻结

```text
OpenCore / 开元
技术栈冻结
Monorepo 结构冻结
文档冻结
```

### S1：Monorepo 骨架

```text
pnpm workspace
Nx
apps/api
apps/admin
packages/shared
packages/config
packages/module-registry
packages/sdk
docs
```

### S2：API + Admin 基础启动

```text
NestJS 起步
Ant Design Pro V6 起步
OpenAPI contract workflow
基础 CI
```

### S3：核心系统模块

```text
用户
角色
权限
菜单
字典
系统配置
文件中心
日志
```

### S4：模块注册表 + 权限治理

```text
module registry
permission registry
menu seed
默认启用 / 默认隐藏
```

### S5：OpenForge 代码生成器雏形

```text
生成 NestJS module
生成 DTO
生成 controller/service
生成 ProTable 页面
生成权限码
生成菜单 seed
生成 E2E skeleton
```

### S6：运维监控

```text
系统状态
版本信息
队列状态
缓存监控
在线会话
定时任务
```

### S7：协同基础

```text
消息中心
待办
Approval Lite
通知
```

### S8：官网

```text
Next.js 官网
文档入口
公开页面
```

### S9：移动端

```text
Expo React Native
登录
消息
待办
审批
个人中心
```

### S10：小程序

```text
Taro + React
轻量业务
消息
审批
文件查看
```

### S11：桌面端

```text
Tauri
桌面壳
本地文件
桌面通知
```

### S12：知识库 / AI 专项

```text
知识库
RAG
检索权限过滤
引用来源
评估集
AI Assistant
```

---

## 9. 第一阶段严格禁止

S0/S1 阶段只建骨架和文档。

禁止：

```text
不写业务代码
不实现登录
不实现 RBAC
不接数据库
不生成 Prisma schema
不初始化 Next.js / Expo / Taro / Tauri
不做知识库
不做 RAG
不做 Agent
不做工作流
不做 CRM / ERP / MES / WMS
不做商城 / 支付 / 会员
不做多租户
不做完整 UI 页面
```

---

## 10. S0/S1 Prompt

```text
请启动一个新的 monorepo 项目，项目名为 OpenCore，中文名“开元”。

产品定位：
OpenCore，开放之源，万物之始。
AI Native 企业级全栈 Monorepo。
面向一人公司、小团队和现代企业应用开发，一套代码库统一管理 API、后台中台、官网、移动端、小程序、桌面端、共享契约、模块注册表、代码生成器和 AI Native 能力预留。

技术栈固定：
- Monorepo：pnpm workspace + Nx
- 后端：NestJS + Prisma + PostgreSQL + Redis + BullMQ + MinIO/S3 + OpenAPI
- 官方后台：Umi Max + Ant Design Pro V6 + ProComponents v3 + antd 6 + React 19
- 官网：Next.js，后续阶段
- 移动端：Expo React Native，后续阶段
- 小程序：Taro + React，后续阶段
- 桌面端：Tauri，后续阶段
- AI Native：第一阶段只做架构预留，不实现 AI 业务

命名：
- 产品名：OpenCore
- 中文名：开元
- monorepo：opencore
- npm scope：@opencore，发布前再核验可用性
- 代码生成器：OpenForge

本阶段只执行 S0/S1：创建 monorepo 骨架和文档，不写业务代码。

请创建以下目录：
- apps/api
- apps/admin
- apps/web/.gitkeep
- apps/mobile/.gitkeep
- apps/miniapp/.gitkeep
- apps/desktop/.gitkeep
- packages/shared
- packages/contracts
- packages/sdk
- packages/auth
- packages/config
- packages/module-registry
- packages/ui-web
- packages/design-tokens
- packages/i18n
- packages/testing
- packages/ai-core
- tools/generator
- tools/scripts
- infra/docker
- infra/nginx
- infra/monitoring
- infra/k8s
- docs/architecture
- docs/modules
- docs/development
- docs/deployment
- docs/runbook
- docs/ai

注意：
web/mobile/miniapp/desktop 这四个 app 本阶段只创建占位目录和 .gitkeep，不初始化 Next.js、Expo、Taro、Tauri 项目，后续阶段再做。

请创建基础配置：
- package.json
- pnpm-workspace.yaml
- nx.json
- tsconfig.base.json
- .gitignore
- README.md

请创建基础文档：
- docs/architecture/overview.md
- docs/architecture/brand.md
- docs/architecture/tech-stack.md
- docs/architecture/monorepo.md
- docs/modules/module-registry.md
- docs/modules/ruoyi-yudao-module-map.md
- docs/modules/priority-roadmap.md
- docs/development/getting-started.md
- docs/development/coding-guidelines.md
- docs/development/openapi-workflow.md
- docs/development/generator-roadmap.md
- docs/ai/ai-native-roadmap.md

文档需要明确：
1. OpenCore 的中文名是“开元”。
2. 品牌语是“开放之源，万物之始”。
3. 定位是“AI Native 企业级全栈 Monorepo”。
4. 前端官方主线使用 Umi Max + Ant Design Pro V6 + ProComponents v3。
5. 不迁移到 Refine。
6. 不使用 Vue。
7. 不使用 Java。
8. 官方 admin 不使用 MUI。
9. 其他 UI 方案未来可以作为额外 app，例如 apps/admin-mui。
10. 小程序使用 Taro + React，不直接使用 React Native。
11. 第一阶段只做 api/admin 规划和基础包，不开发 mobile/miniapp/desktop。
12. 模块分层采用 core / monitor / tool / collaboration / optional / industry / integration / ai / experimental。
13. 学习 RuoYi/Yudao 的模块地图、权限粒度、代码生成器和精简版/完整版思路，但不复制其 Java/Vue 代码。
14. AI Native 第一阶段只做架构预留，不实现 RAG、Agent、知识库或模型调用。

严格禁止：
- 不写业务代码
- 不实现登录
- 不实现 RBAC
- 不接数据库
- 不生成 Prisma schema
- 不初始化 Next.js / Expo / Taro / Tauri
- 不做知识库
- 不做 RAG
- 不做 Agent
- 不做工作流
- 不做 CRM / ERP / MES / WMS
- 不做商城 / 支付 / 会员
- 不做多租户

完成后输出：
- 创建文件清单
- 项目结构树
- 技术栈确认
- 后续 S2 建议
- 风险点
```
