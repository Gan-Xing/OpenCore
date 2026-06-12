# OpenCore Cycle-021 Capability Map Productization Handoff

Date: 2026-06-12  
Repository: `Gan-Xing/OpenCore`  
Default branch: `main`  
Latest observed feature commit: `0381de1 feat(monitor-online-user): productize online sessions / 产品化在线会话管理`  
Latest deployed hardening commit: `f4569a4 fix(api): tolerate duplicated API prefix on login / 兼容登录重复 API 前缀`

## One-sentence Goal

基于已完成的 BE20 后端运行时包化闭环，启动 cycle-021 capability-map 产品化递归：由 AI 实时对比若依/芋道与 OpenCore，按最低依赖能力缺口逐轮补齐 API/SDK/Admin/权限/菜单/种子/OpenAPI/smoke-e2e，并在每个可验收功能后 commit & push，直到 OpenCore 成为可真实登录、可完整操作、可观测、可生成的现代 TS/NestJS monorepo 企业后台底座。

## Current Project State Rechecked

OpenCore 当前已经不是 skeleton，也不是单纯规划文档。当前 README、handoff 索引、strategy progress、cycle-020 backlog 和 completion report 均显示：S0/S1、D1-D6、S2-S9、Runtime Integration R-1-R7、OpenForge V1、Quality Cycle 001、Admin Pro V6 migration、Backend Self-Loop BE20 均已完成。

BE20 已把若依/芋道主干后台能力按 OpenCore 的 TS/NestJS monorepo 边界转译为 package-owned runtime：

- `@opencore/common`: 后端通用常量、错误码、响应契约、分页、排序、bounded filters。
- `@opencore/core`: NestJS foundation、异常过滤、响应拦截、request context、OpenAPI helpers、安全 headers、结构化日志。
- `@opencore/database`: Prisma service/module、事务 helper、seed helper。
- `@opencore/redis`: Redis client、key naming、TTL/cache helpers、BullMQ connection options。
- `@opencore/file`: local/MinIO/S3 storage abstraction、安全 object key、文件输入校验。
- `@opencore/system`: dict、config、notice、dept、post、menu、role、user runtime。
- `@opencore/security`: auth、JWT/password/captcha、permission/role/data-scope guards。
- `@opencore/audit`: login log、operation log、audit decorator/interceptor。
- `@opencore/online-user`: online user/session runtime 和 kick-out audit context。
- `@opencore/scheduler`: scheduler definitions、run logs、BullMQ-oriented metadata、registry whitelist。
- `@opencore/monitor`: health、status、version、queue、cache/runtime diagnostics。
- `@opencore/generator-core`: OpenForge schema/config、planning、diff、rendering、VFS、safe apply、manifest、rollback、doctor core。
- `tools/generator`: OpenForge CLI wrapper，提供 status、doctor、gate、plan/diff/check/apply/manifest/rollback。
- `apps/api`: composition root only，只保留 bootstrap、HTTP entry aggregation、module aggregation、runtime config、OpenAPI export/check。

Admin 当前是 Umi Max + Ant Design Pro V6 + ProComponents v3 + antd 6 + React 19，已有 Dashboard、System、Security、Monitor、Tools、Collaboration、Optional、Integrations 页面和 smoke test。最新安全修复已移除 vulnerable `mockjs` / `@umijs/openapi` 依赖链，Admin `openapi` 脚本现在委托根目录 `openapi:export` + `sdk:check`，后续不得重新引入该依赖链。

## Current Cycle-021 Status

Cycle-021 已进入 capability-map productization recursion，并已完成这些
independently accepted stage loops. These entries are not all final
productization waterline completion; see
`docs/quality-cycle/cycle-021/productization-waterline-audit.md`:

- Round 1 `core.notice`
- Round 2 `core.dept`
- Round 3 `core.post`
- Round 4 `core.menu`
- Round 5 `core.role`
- Round 6 `core.permission`
- Round 7 `core.user`
- Round 8 `core.dict`
- Round 9 `core.config`
- Round 10 `core.file`
- Round 11 `core.login-log`
- Round 12 `core.audit-log`
- Round 13 `monitor.online-user`

Round 9 还沉淀了固定端口本地 smoke/deploy 路径：
`pnpm smoke:api:local` 使用 `39173`，`pnpm deploy:opencore` 使用 API
`39172` 和 Admin `39174`。后续改完代码不要再手动挑 3000/3010；走脚本，端口
占用就修占用或显式覆盖。

Round 10 继续沉淀部署路径：`pnpm deploy:opencore` 会让 Admin 监听
`0.0.0.0:39174`，构建时默认使用检测到的服务器公网 API 地址，并在输出里打印
公网 Admin URL。当前服务器验证过的入口是 `http://144.217.243.161:39174`，
API 是 `http://144.217.243.161:39172`。

Round 11 修复并沉淀了前端登录 405 根因：Admin bundle 之前没有把
`ADMIN_API_BASE_URL` 编进浏览器产物，导致浏览器把 `POST /api/auth/login`
打到 `http://144.217.243.161:39174` 的静态服务器，静态服务器只收 GET/HEAD
所以返回 405。现在 `pnpm deploy:opencore` 会强制校验构建后的 JS 是否包含公网
API base URL，并且 Admin 静态服务器会把 `/api/*` 代理到部署 API；部署过程还会
通过 Admin 同源 `/api/auth/login` 做一次真实登录冒烟。

Round 12 修复并沉淀了前端登录 `/api/api` 根因：Admin SDK request helper
会自己给请求路径加 `/api`，所以 `ADMIN_API_BASE_URL` 必须是 API origin，
例如 `http://144.217.243.161:39172`，不能是
`http://144.217.243.161:39172/api`。现在 `pnpm deploy:opencore` 默认使用
origin，并会在配置值以 `/api` 或 `/api/` 结尾时直接失败，避免浏览器再次发出
`/api/api/auth/login`。

Round 13 产品化了 `monitor.online-user`：Admin 在线用户页面现在走 live SDK
service，可列表、详情、当前页导出并按 `monitor:online-user:manage` 强退会话；
固定 smoke 会强退 `session_operator`，同时验证 `session_admin` 仍保持 active。
本轮也继续沉淀部署路径：Admin 静态服务器会返回 no-store 的退役
`/service-worker.js` 清理旧 Workbox cache，并把旧标签页发出的 `/api/api/*`
代理请求归一化为 `/api/*`。`pnpm deploy:opencore` 会在启动后从公开 Admin URL
拉取登录 HTML、当前 `umi.*.js` 和退役 service worker，确认 bundle 包含 API
origin 且不包含重复 API 前缀。

Post Round 13 re-audit corrected the meaning of "minimal loop": one round is a
minimal deployable, testable and reversible stage, not a minimal final product.
The productization waterline now classifies:

- Meets current waterline: Round 6 `core.permission`, Round 12
  `core.audit-log`.
- First loop, enhance: Round 1 `core.notice`, Round 2 `core.dept`, Round 3
  `core.post`, Round 5 `core.role`, Round 7 `core.user`, Round 8
  `core.dict`, Round 9 `core.config`, Round 11 `core.login-log`.
- Thin, rework: Round 4 `core.menu`, Round 10 `core.file`, Round 13
  `monitor.online-user`.

The next rounds should prioritize this P0 remediation queue before opening more
broad surfaces:

1. `monitor.online-user` stage 2: real token/session revocation enforcement,
   batch kick-out, browser/OS parsing and IP fields, with smoke proving a
   kicked token returns 401.
2. `core.file` stage 2: authenticated upload/download or preview loop backed
   by the existing file storage boundary.
3. `core.menu` stage 2: tree menu model and Admin tree operations aligned with
   route/menu metadata.

Commit `f4569a4` also fixed the remaining stale-login failure at API level:
`@opencore/core` now normalizes duplicate global prefixes before Nest route
matching, and `pnpm deploy:opencore` smokes
`POST /api/api/auth/login` directly against the API. Do not remove this guard.

Admin 生产构建已默认强制稳定 webpack 路径。不要为 OpenCore deploy 打开
`FORCE_UTOOPACK`；utoopack 已多次在 `global.less.css` CSS loader
deserialization 上失败。webpack 构建同时保留 `esbuildMinifyIIFE: true`，避免
Umi `esbuildHelperChecker` helper-name 冲突。

当前默认前端登录入口：`http://144.217.243.161:39174/user/login`。如果浏览器
仍显示旧的 `/api/api/auth/login`，用
`http://144.217.243.161:39174/user/login?v=basefix` 打开以避开旧标签页缓存。
当前本地部署
账号为 `admin`，密码来自 `.env.opencore.local` 的
`BOOTSTRAP_ADMIN_PASSWORD`；不要再把 `admin123` 当作这台服务器的有效密码。

## Resolved State Alignment

文档和 ledger 曾记录 cycle-020 / BE20 完成，但 `.opencore/quality-cycle/state.json`
仍显示：

```json
{
  "maxCycles": 20,
  "completedCycles": 19,
  "activeCycle": 20,
  "deadlineLondon": "2026-06-11 05:30:00 Europe/London"
}
```

`docs/quality-cycle/ledger.md` 已有：

```txt
2026-06-12 08:46:02 UTC documented cycle-020 completion; checked=24 backend modules; goalDuration=5h52m55s
```

Round 1 已处理这个状态对齐点，将 state 对齐到 cycle-021 active 状态。后续不应
再把这个 mismatch 当作阻塞项。

不要继续使用 `docs/quality-cycle/opencore-backend-self-loop.md` 作为主执行 prompt；
BE20 已完成，当前主线是 cycle-021 capability-map productization recursion。

## What The Next AI Should Do

下一轮不是固定任务清单，而是能力地图差距递归。AI 必须实时查询当前 OpenCore、若依、芋道和相关旧项目，自己判断当前最低依赖、最高价值、最小可闭环的产品化缺口。当前在打开新产品面之前，必须先按 `productization-waterline-audit.md` 的 P0 欠账队列补齐薄弱轮次。

### Mandatory first read

- `README.md`
- `docs/handoff/README.md`
- `docs/modules/priority-roadmap.md`
- `docs/strategy/progress.md`
- `.opencore/quality-cycle/state.json`
- `docs/quality-cycle/ledger.md`
- `docs/quality-cycle/cycle-020/backlog.md`
- `docs/quality-cycle/cycle-020/completion-report.md`
- `package.json`
- `apps/admin/package.json`
- `apps/api/src/app/app.module.ts`
- `packages/module-registry`
- `packages/contracts`
- `packages/sdk`
- `tools/generator`
- `prisma/schema.prisma`
- `docs/quality-cycle/cycle-021/productization-waterline-audit.md`

### Mandatory reference comparison

实时对比参考仓库，但不要复制代码：

- 若依 / RuoYi：能力地图、系统/监控/工具/代码生成、权限粒度、菜单组织。
- 芋道 / Yudao：Lite/Full 分层、system/infra/monitor/workflow/report/pay/mall/member/CRM/ERP/MES/WMS/AI/integration 能力地图。
- OpenCore 当前实现：module-registry、OpenAPI、SDK、Admin routes/access、Prisma seed、tests、smoke/e2e。

## Self-loop Protocol

每一轮只做一个最小端到端产品化闭环，不要一次写一堆大模块。

循环如下：

1. 审计当前 OpenCore 状态和参考仓库能力地图。
2. 找到当前最低依赖、最高价值、最小可闭环的能力缺口。
3. 写入本轮 backlog/audit/reference-comparison。
4. 实现完整闭环：
   - package runtime 或 API aggregation，按当前架构边界选择。
   - Prisma schema / migration / seed，如适用。
   - Controller / Service / Repository / DTO。
   - Permission code / menu / module-registry / OpenAPI tag。
   - OpenAPI export/check。
   - SDK types/client/fixtures/tests。
   - Admin route/access/menu/page/action/detail/export/smoke。
   - unit/integration/smoke/e2e。
   - docs/handoff/progress/implementation-notes/completion-report。
5. 运行 focused tests。
6. 运行 full gate。
7. 每完成一个可独立验收功能，必须使用 commit and push skill：
   - 查看 git status / diff。
   - 运行相关测试。
   - commit message 必须含英文 + 中文摘要。
   - push 到远端。
   - 在 implementation notes/progress 中记录 commit hash。
8. 回到第 1 步，继续下一轮差距审计。

## Preferred Cycle-021 Theme

不要预设具体任务，但从当前状态看，cycle-021 最适合进入“产品化闭环 hardening”，优先审计这些方向：

- 真实登录后，Admin 是否能完整操作 System/Security/Monitor/Tools/Collaboration/Optional/Integrations。
- SDK/OpenAPI/Admin routes/access/module-registry 是否完全无 drift。
- 种子数据是否覆盖真实演示路径，不只是单元测试数据。
- smoke/e2e 是否覆盖登录、菜单、权限、列表、详情、导出、状态变更、错误/403/401。
- 已准入 collaboration / operations / integration design-only 能力是否需要进一步 hardening。
- OpenForge 是否继续保持 safe generator，不越权生成 Prisma schema/migration/business logic。

## Scope Guards

不得直接实现或偷偷扩大这些能力：

- CRM、ERP、MES、WMS、商城、会员、行业业务包。
- 多租户生产闭环。
- 真实支付、支付回调、退款、对账。
- BPMN/Flowable 风格完整工作流平台。
- 完整报表设计器、大数据异步导出生产执行。
- 知识库、RAG、Agent、AI workflow execution。
- 无白名单动态反射调度。
- OpenForge 写 Prisma schema / migration / business logic。
- 重新引入 vulnerable `mockjs` / `@umijs/openapi` 依赖链。

这些能力只能进入 backlog、design-only 或独立准入评估。

## Required Gates

根据改动范围运行 focused gates；每个可验收闭环完成前至少运行：

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm prisma:validate
pnpm openapi:export
pnpm openapi:registry-tags:check
pnpm openapi:check
pnpm registry:admin-routes:check
pnpm test:api
pnpm test:admin
NX_DAEMON=false pnpm nx test contracts
NX_DAEMON=false pnpm nx test module-registry
NX_DAEMON=false pnpm nx test sdk
```

涉及 OpenForge 时额外运行：

```bash
pnpm openforge:status
pnpm openforge:check
pnpm openforge:doctor
pnpm openforge:gate
pnpm openforge:test
NX_DAEMON=false pnpm nx test openforge
NX_DAEMON=false pnpm nx build openforge
```

失败必须修复，不能跳过、不能删除测试、不能用 mock 假完成。

## Stop Conditions

只有以下情况允许暂停：

1. 当前选择的能力缺口完成端到端闭环、测试通过、已 commit & push，并且 handoff/progress 已更新。
2. 遇到外部密钥、数据库权限、CI 权限或破坏性冲突，无法继续自动修复。
3. 发现当前需求会违反 scope guards，需要转为 design-only 或 backlog。

暂停时必须输出：

```txt
本轮能力：
完成内容：
涉及文件：
测试结果：
commit hash：
push 结果：
若依/芋道参考点：
OpenCore TS/NestJS 取舍：
剩余风险：
下一轮建议：
```
