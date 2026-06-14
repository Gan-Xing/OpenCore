# OpenCore Admin Ant Design Pro V6 架构迁移 Handoff

建议保存路径：`docs/handoff/2026-06-11-admin-ant-design-pro-v6-migration-handoff.md`  
执行分支：`fix/admin-ant-design-pro-v6`  
执行方式：直接在该分支继续修改，不新开分支。  
目标：把 `apps/admin` 完整迁移到官方 Ant Design Pro V6 架构，同时保留并联通 OpenCore main 已有业务页面、SDK、权限、路由、OpenAPI、后端 API。

---

## 0. 迁移总原则

本次不是“换几个页面”，而是 **Admin 架构纠偏**。

必须遵守：

```text
架构来源：fix/admin-ant-design-pro-v6
业务来源：origin/main
后端来源：apps/api + packages/sdk + OpenAPI
权限来源：Permission.code + module-registry
路由来源：OpenCore 正式模块，而不是 Ant Design Pro demo routes
```

禁止：

```text
不直接 merge demo 页面进正式菜单
不删除 main 已实现的 OpenCore 页面能力
不使用 Ant Design demo API
不使用 pro-api.ant-design-demo.workers.dev
不让权限退化成角色名判断
不绕过 @opencore/sdk / OpenAPI 契约手写漂移类型
不破坏 module-registry / OpenForge / OpenAPI drift gate
```

---

## 1. 当前背景

`fix/admin-ant-design-pro-v6` 分支已经包含目标 Admin 架构资产：

```text
apps/admin/package.json
apps/admin/config/config.ts
apps/admin/config/routes.ts
apps/admin/config/defaultSettings.ts
apps/admin/config/proxy.ts
apps/admin/src/app.tsx
apps/admin/src/requestErrorConfig.ts
apps/admin/src/components/**
apps/admin/src/locales/**
apps/admin/src/pages/user/login/**
apps/admin/src/services/**
```

该分支的 `package.json` 已接近官方 Ant Design Pro V6 结构，包含：

```text
@umijs/max
@umijs/max-plugin-openapi
@umijs/request-record
@ant-design/pro-components
antd 6
React 19
React Query
Vitest
Biome
react-doctor
openapi script
preview/record/doctor scripts
```

但该分支仍含大量 demo route/page/service，例如：

```text
/welcome
/admin/sub-page
/form/*
/list/*
/profile/*
/result/*
/account/*
/chatbot
pro-api.ant-design-demo.workers.dev
oneapi.json demo schema
@/services/ant-design-pro/api demo currentUser
```

这些不能作为 OpenCore 正式前端。

---

## 2. 最终目标

完成后 `apps/admin` 应满足：

```text
1. 使用 fix/admin-ant-design-pro-v6 的官方 Ant Design Pro V6 架构。
2. 使用 config/config.ts + config/routes.ts，而不是简单 .umirc.ts 手写壳。
3. 保留 ProLayout runtime、getInitialState、layout、SettingDrawer、AvatarDropdown、Footer、ErrorBoundary、requestErrorConfig、locales、OpenAPI plugin、React Query。
4. 正式路由只包含 OpenCore 页面：
   - /dashboard
   - /system/*
   - /security/*
   - /monitor/*
   - /tools/*
   - /collaboration/*
   - /optional/*
   - /integrations/*
   - /user/login
   - /403 /404 /500
5. 删除或隔离 Ant Design Pro demo routes/pages/services。
6. Admin 登录和 current user 使用 OpenCore 后端：
   - POST /api/auth/login
   - GET /api/auth/me
7. 所有业务接口通过 @opencore/sdk 或 OpenAPI generated service。
8. access.ts 继续基于 Permission.code。
9. registry:admin-routes:check 通过。
10. OpenForge Admin templates 更新为新架构。
11. build/test/typecheck/lint/openapi/sdk/registry gates 全部通过。
```

---

## 3. 必读文件

### 3.1 分支本身

```text
apps/admin/package.json
apps/admin/config/config.ts
apps/admin/config/routes.ts
apps/admin/config/defaultSettings.ts
apps/admin/config/proxy.ts
apps/admin/src/app.tsx
apps/admin/src/requestErrorConfig.ts
apps/admin/src/components/**
apps/admin/src/locales/**
apps/admin/src/pages/user/login/**
apps/admin/src/services/**
```

### 3.2 main 业务来源

从 `origin/main` 读取：

```text
apps/admin/.umirc.ts
apps/admin/package.json
apps/admin/project.json
apps/admin/src/access.ts
apps/admin/src/app.tsx
apps/admin/src/core/**
apps/admin/src/utils/**
apps/admin/src/pages/Dashboard/**
apps/admin/src/pages/System/**
apps/admin/src/pages/Security/**
apps/admin/src/pages/Monitor/**
apps/admin/src/pages/Tools/**
apps/admin/src/pages/Collaboration/**
apps/admin/src/pages/Optional/**
apps/admin/src/pages/Integrations/**
apps/admin/scripts/**
packages/sdk/**
packages/module-registry/**
packages/contracts/**
apps/api/src/modules/**
tools/generator/src/templates/**
tools/scripts/check-admin-route-access.ts
```

### 3.3 后端联调来源

```text
apps/api/src/modules/core/rbac/auth.controller.ts
apps/api/src/modules/core/rbac/auth.service.ts
apps/api/src/modules/core/rbac/rbac.controller.ts
apps/api/src/modules/core/system-management/**
apps/api/src/modules/monitor/**
apps/api/src/modules/tool/**
apps/api/src/modules/collaboration/**
apps/api/src/modules/integration/**
apps/api/src/modules/monitor/operations/**
packages/contracts/openapi/opencore-api.json
packages/sdk/src/**
```

---

## 4. Stage A：分支基线审计

### 目标

确认当前工作分支是 `fix/admin-ant-design-pro-v6`，审计它与 `origin/main` 的 Admin 差异。

### 步骤

```bash
git fetch origin
git checkout fix/admin-ant-design-pro-v6
git pull origin fix/admin-ant-design-pro-v6
git status
```

生成文档：

```text
docs/handoff/admin-ant-design-pro-v6-migration-notes.md
```

文档必须包含：

```text
当前分支 commit
origin/main commit
目标分支可复用架构资产
main 必须迁移的业务页面
必须删除的 demo route/page/service
后端联调 API 清单
风险清单
```

### 验收

```bash
git branch --show-current
```

必须输出：

```text
fix/admin-ant-design-pro-v6
```

---

## 5. Stage B：保留 Pro V6 架构底座

### 目标

以 `fix/admin-ant-design-pro-v6` 的官方 Pro V6 架构为底座，不回退到 `.umirc.ts` 壳。

### 必须保留

```text
apps/admin/config/config.ts
apps/admin/config/defaultSettings.ts
apps/admin/config/proxy.ts
apps/admin/config/routes.ts
apps/admin/src/app.tsx
apps/admin/src/requestErrorConfig.ts
apps/admin/src/components/Footer
apps/admin/src/components/AvatarDropdown
apps/admin/src/components/ErrorBoundary
apps/admin/src/components/LangDropdown
apps/admin/src/components/VersionDropdown
apps/admin/src/components/OfflineBanner
apps/admin/src/locales/**
```

### 必须调整

```text
config/config.ts
  - title: OpenCore Admin
  - layout 使用 defaultSettings
  - openAPI 指向 OpenCore OpenAPI snapshot 或本地导出文件
  - request/proxy 指向 OpenCore API
  - 不使用 demo oneapi 作为业务真源

config/proxy.ts
  - dev/test/pre 指向本地 OpenCore API
  - 默认 target: http://localhost:3000
  - 保留 /api/ prefix
```

### 禁止

```text
不把 .umirc.ts 作为正式主配置
不使用 pro-api.ant-design-demo.workers.dev
不使用 preview.pro.ant.design
```

---

## 6. Stage C：删除或隔离 Demo 内容

### 目标

清理 Ant Design Pro 官方 demo 业务，不让它进入正式菜单或测试。

### 必须移出正式 routes

```text
/welcome
/admin
/admin/sub-page
/form/*
/list/*
/profile/*
/result/*
/account/*
/chatbot
/user/register
/user/register-result
```

允许保留：

```text
/user/login
/403
/404
/500
```

如果 demo 页面暂时保留源码，必须放到：

```text
apps/admin/src/pages/_demo/**
```

并且不得出现在正式 `config/routes.ts`。

### 验收

```bash
grep -R "pro-api.ant-design-demo" apps/admin || true
grep -R "preview.pro.ant.design" apps/admin || true
grep -R "oneapi.json" apps/admin/config apps/admin/src || true
```

以上不得作为正式业务配置出现。

---

## 7. Stage D：迁移 OpenCore 业务页面

### 目标

把 `origin/main` 的 OpenCore 页面迁移到 Pro V6 架构。

### 必须迁移页面

```text
Dashboard
System/Users
System/Roles
System/Permissions
System/Menus
System/Dicts
System/Config
System/Files
Security/LoginLogs
Security/OperationLogs
Monitor/Status
Monitor/Version
Monitor/Queues
Monitor/Jobs
Monitor/Cache
Monitor/OnlineUsers
Tools/OpenApi
Tools/Export
Tools/OpenForge
Collaboration/Messages
Collaboration/Notices
Collaboration/Todos
Collaboration/Approvals
Optional/Reports
Optional/ExportJobs
Integrations/Providers
Integrations/Mail
Integrations/Sms
Integrations/OAuth
Integrations/WeChat
Integrations/WebSocket
Integrations/BillingDesign
Exception/403
Exception/404
Exception/500
```

### 迁移要求

```text
1. 页面路径适配 Pro V6 src/pages 命名规范。
2. 保留原页面 SDK 调用。
3. 保留原页面权限判断。
4. 保留空状态、错误状态、导出按钮、详情抽屉、安全脱敏 helper。
5. 不把页面降级成静态假数据。
6. 不把页面改回 demo mock。
```

---

## 8. Stage E：重建正式 routes

### 目标

用 `config/routes.ts` 组织 OpenCore 正式路由。

### 路由结构

```text
/user/login

/dashboard

/system/users
/system/roles
/system/permissions
/system/menus
/system/dicts
/system/config
/system/files

/security/login-logs
/security/operation-logs

/monitor/status
/monitor/version
/monitor/queues
/monitor/jobs
/monitor/cache
/monitor/online-users

/tools/openapi
/tools/export
/tools/openforge

/collaboration/messages
/collaboration/notices
/collaboration/todos
/collaboration/approvals

/optional/reports
/optional/export-jobs

/integrations/providers
/integrations/mail
/integrations/sms
/integrations/oauth
/integrations/wechat
/integrations/websocket
/integrations/billing-design

/403
/404
/500
```

### 要求

```text
1. route name/icon 合理。
2. route access 对应 Permission.code。
3. 根路径 redirect 到 /dashboard。
4. catch-all 到 404。
5. 与 module-registry menus/admin routes 对齐。
```

### 验收

```bash
pnpm registry:admin-routes:check
```

---

## 9. Stage F：Auth / InitialState / Request 联调

### 目标

把 Pro V6 runtime `src/app.tsx` 从 demo API 改成 OpenCore 后端。

### 必须实现

```text
POST /api/auth/login
GET /api/auth/me
Authorization: Bearer <token>
x-request-id
x-trace-id
401 -> /user/login?redirect=
403 -> 403 page
统一错误提示 -> requestErrorConfig
```

### token 存储

建议：

```text
localStorage key: opencore.admin.token
```

或复用 main 已有 token utility。必须集中封装，不允许页面散落读写。

### getInitialState 必须返回

```ts
{
  (currentUser, permissions, menus, settings, fetchUserInfo);
}
```

### 禁止

```text
不再 import "@/services/ant-design-pro/api" 作为正式 currentUser
不再使用 demo CurrentUser 类型
不再请求 https://pro-api.ant-design-demo.workers.dev
```

---

## 10. Stage G：SDK / OpenAPI / Services 统一

### 目标

业务页面使用 OpenCore SDK 或 OpenAPI generated services，不手写漂移类型。

### 要求

```text
1. 优先复用 @opencore/sdk。
2. 如果使用 @umijs/max-plugin-openapi，schemaPath 必须来自 OpenCore OpenAPI snapshot。
3. 不允许 Ant Design demo oneapi 作为正式服务源。
4. API base URL 必须支持本地 dev proxy。
5. 所有接口错误进入 requestErrorConfig。
```

### 验收

```bash
pnpm openapi:export
pnpm openapi:check
pnpm sdk:check
```

---

## 11. Stage H：Access 权限迁移

### 目标

把 access 保持为 Permission.code 驱动。

### 必须保留

```text
core:dashboard:read
core:user:read
core:role:read
core:permission:read
core:menu:read
core:dict:read
core:config:read
core:file:read
core:audit-log:read
core:login-log:read
monitor:status:read
monitor:version:read
monitor:queue:read
monitor:queue:manage
tool:openapi:read
tool:export:read
tool:openforge:read
collaboration:message:read
collaboration:notice:read
collaboration:todo:read
collaboration:approval-lite:read
monitor:job:read
monitor:cache:read
monitor:online-user:read
optional:report:read
optional:export-job:read
integration:provider:read
integration:mail:read
integration:sms:read
integration:oauth:read
integration:wechat:read
integration:websocket:read
integration:billing-design:read
```

### 禁止

```text
不按 role name 判断
不写 canAdmin = true 作为正式权限
不把所有页面默认放开
```

---

## 12. Stage I：测试与工具迁移

### 目标

让 Admin 的 Pro V6 工具链进入 monorepo gate。

### 需要调整

```text
apps/admin/project.json
apps/admin/package.json
root package.json scripts
apps/admin/scripts/smoke-test.mjs
vitest config
biome config 或 root lint 兼容
tsconfig
```

### 最低验收命令

```bash
pnpm build:admin
pnpm test:admin
pnpm typecheck
pnpm lint
pnpm registry:admin-routes:check
```

### 如果 Biome 与 root lint 冲突

优先保持 root `pnpm lint` 可通过。  
不要为了引入 Biome 破坏全仓 lint。

---

## 13. Stage J：OpenForge Admin Templates 同步

### 目标

OpenForge 后续生成的 Admin 页面必须符合新 Pro V6 架构。

### 必须更新

```text
tools/generator/src/templates/**
tools/generator/src/render/**
tools/generator/examples/**
tools/generator/src/**/admin*
docs/development/openforge-template-authoring.md
docs/development/openforge-v1-architecture.md
```

### 要求

```text
1. generated Admin pages 使用新 src/pages 组织。
2. generated route patch 指向 config/routes.ts。
3. generated access patch 指向 src/access.ts。
4. generated services 使用 SDK/OpenAPI。
5. 不再生成适配旧 .umirc.ts 壳的 Admin 输出。
```

### 验收

```bash
pnpm openforge:check
pnpm openforge:gate
NX_DAEMON=false pnpm nx test openforge
```

---

## 14. Stage K：后端联调 Smoke

### 目标

验证 Admin 可以和 OpenCore API 联调。

### 必须验证

```text
1. API 可启动。
2. Admin 可启动。
3. 登录请求命中 /api/auth/login。
4. current user 请求命中 /api/auth/me。
5. Dashboard 可访问。
6. 至少一个 System 页面可访问并调用 SDK。
7. 至少一个 Monitor 页面可访问并调用 SDK。
8. 401 会跳登录。
9. 403 会显示无权限页。
10. request id / trace id headers 保留。
```

### 命令建议

```bash
pnpm dev:api
pnpm dev:admin
curl http://localhost:3000/health/live
curl http://localhost:3000/health/ready
```

如无法做 live smoke，必须写明原因，并保证 build/test/smoke 通过。

---

## 15. Stage L：文档收口

### 必须更新

```text
README.md
docs/README.md
docs/handoff/README.md
docs/strategy/progress.md
docs/modules/priority-roadmap.md
docs/development/admin-bootstrap-plan.md
docs/development/openforge-template-authoring.md
docs/handoff/2026-06-11-admin-ant-design-pro-v6-migration-handoff.md
```

### 文档必须说明

```text
Admin 架构已切换到官方 Ant Design Pro V6
架构来源 fix/admin-ant-design-pro-v6
业务页面来源 origin/main
正式路由清单
删除/隔离 demo routes 清单
后端联调 API
权限模型
测试命令
剩余风险
```

---

## 16. 最终必跑命令

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm build:admin
pnpm test:admin
pnpm openapi:export
pnpm openapi:check
pnpm openapi:registry-tags:check
pnpm registry:admin-routes:check
pnpm sdk:check
pnpm openforge:check
pnpm openforge:gate
```

如果某个命令失败，必须继续修复，不允许停止重新规划。

---

## 17. 完成标准

全部满足才算完成：

```text
1. 当前分支仍是 fix/admin-ant-design-pro-v6。
2. apps/admin 使用官方 Ant Design Pro V6 架构。
3. 正式 config/routes.ts 只保留 OpenCore 路由和必要 login/error。
4. demo API、demo services、demo routes 不进入正式运行路径。
5. main 已有 OpenCore 页面全部迁移。
6. 登录/current user 联调 OpenCore 后端。
7. access 基于 Permission.code。
8. SDK/OpenAPI/registry gate 全部通过。
9. OpenForge Admin templates 已更新。
10. build/test/lint/typecheck 全部通过。
11. 文档和 progress 已更新。
```

---

## 18. 推荐 Commit Summary

```text
refactor(admin): migrate to Ant Design Pro V6 architecture

中文：在 fix/admin-ant-design-pro-v6 分支上完成 OpenCore Admin 架构纠偏，采用官方 Ant Design Pro V6 config/app/layout/request/i18n/openapi 体系，迁移 main 上已有 OpenCore 页面，删除或隔离 demo routes/services，联调 OpenCore 后端 auth/me/API，保持 Permission.code 权限、SDK/OpenAPI、module-registry 和 OpenForge 模板链路。
English: Complete the OpenCore Admin architecture migration on fix/admin-ant-design-pro-v6 by adopting the official Ant Design Pro V6 config/app/layout/request/i18n/openapi stack, migrating existing OpenCore pages from main, removing or isolating demo routes/services, wiring auth/me/API to the OpenCore backend, and preserving Permission.code access, SDK/OpenAPI, module-registry, and OpenForge template contracts.

Tests:
- pnpm format:check
- pnpm lint
- pnpm typecheck
- pnpm test
- pnpm build
- pnpm build:admin
- pnpm test:admin
- pnpm openapi:export
- pnpm openapi:check
- pnpm openapi:registry-tags:check
- pnpm registry:admin-routes:check
- pnpm sdk:check
- pnpm openforge:check
- pnpm openforge:gate
```

---

## 19. Execution Update

Status: implemented on `fix/admin-ant-design-pro-v6`.

Implemented:

- Preserved the official Ant Design Pro V6 architecture files: `config/config.ts`, `config/routes.ts`, `config/defaultSettings.ts`, `config/proxy.ts`, `src/app.tsx`, `src/requestErrorConfig.ts`, components, locales, OpenAPI plugin, request-record, React Query and Vitest.
- Migrated OpenCore business pages from `origin/main`: Dashboard, System, Security, Monitor, Tools, Collaboration, Optional, Integrations and 403/404/500.
- Removed formal Ant Design Pro demo routes/pages/services/mocks/config: `/welcome`, `/admin`, `/form/*`, `/list/*`, `/profile/*`, `/result/*`, `/account/*`, `/chatbot`, `/user/register`, `/user/register-result`, `src/services/ant-design-pro/**`, `apps/admin/mock/**`, `config/oneapi.json`, `config/routes.simple.ts`.
- Rebuilt `config/routes.ts` with only OpenCore formal routes, `/user/login`, 403/404/500, root redirect to `/dashboard`, and catch-all 404.
- Rewired auth/current user through `@opencore/sdk`: `POST /api/auth/login`, `GET /api/auth/me`, `Authorization: Bearer`, token key `opencore.admin.token`.
- Added the shared OpenCore SDK request helper and platform service: `src/services/opencore/client.ts` prefixes `/api` and preserves bearer handling, while `src/services/opencore/platform.ts` exposes live System/Monitor SDK calls.
- Re-audit fix: `System/Users` now calls `createRbacClient(...).listUsers`; `Monitor/Status` now calls `createMonitoringClient(...).getStatus`. Fixture data remains only as a fallback snapshot.
- Centralized request headers/error handling in `requestErrorConfig`: `x-request-id`, `x-trace-id`, bearer token, 401 login redirect, 403 no-permission page.
- Kept access checks based on `Permission.code`; `registry:admin-routes:check` now parses `apps/admin/config/routes.ts`.
- Updated OpenForge Admin route patch output and docs to target `apps/admin/config/routes.ts`.

Verified:

- `pnpm --dir apps/admin test`
- `pnpm format:check`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm test:admin`
- `pnpm build:admin`
- `pnpm openapi:export`
- `pnpm openapi:check`
- `pnpm openapi:registry-tags:check`
- `pnpm registry:admin-routes:check`
- `pnpm sdk:check`
- `pnpm openforge:check`
- `pnpm openforge:gate`
- `NX_DAEMON=false pnpm nx test openforge`
- `pnpm prisma:migrate`
- `pnpm prisma:seed`
- Re-audit targeted checks: `origin/main` formal page roots all exist in the worktree; demo API/routes/services are absent from formal routes/runtime; Admin smoke enforces live SDK calls from `System/Users` and `Monitor/Status`.

Live smoke:

- Local API and Admin dev servers were started with `.env.opencore.local`.
- Verified API health live/ready.
- Verified Admin SPA route serving for `/user/login`, `/dashboard`, `/system/users`, `/monitor/status` and `/403`.
- Verified `POST /api/auth/login`, `GET /api/auth/me`, `GET /api/core/users` and `GET /api/monitor/status`.
- Verified no-token `GET /api/auth/me` returns 401.
- Verified a temporary local viewer user receives 403 on `GET /api/monitor/status`.
- Verified `x-request-id` and `x-trace-id` are preserved on success, 401 and 403 responses.
- Interactive browser automation was not run because `gstack browse` is not built in this checkout and Playwright/Puppeteer are not installed; Admin browser-side request/error branches are covered by smoke/Vitest.
- Boundary: this migration does not claim every business page is fully live-backend. It preserves `origin/main` page behavior and now satisfies the handoff's page-level live SDK requirement for one System page and one Monitor page; the remaining fixture-backed pages are still a later module admission task.
