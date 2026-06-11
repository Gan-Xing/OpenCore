# OpenCore 1-6 阶段质量递归 Handoff

更新时间：2026-06-10  
建议保存路径：`docs/handoff/2026-06-10-opencore-1-6-quality-recursion-handoff.md`  
适用执行者：Codex / GPT-5.5 xhigh  
循环目标：围绕阶段 1-6，持续执行“审计 → 生成完整 backlog → 全部完成 → 全仓验收 → 计数 +1 → 再审计”的质量递归。  
停止条件：完成 20 个 cycle，或伦敦时间 2026-06-11 05:30 到达或超过。  
计数语义：只有当前 cycle 的全部 backlog 完成、验收通过、completion report 写好、计数脚本通过，才算 1 次。

---

## 0. 总原则

这不是“做一个小功能就算一轮”。  
这不是“完成一个子任务就计数”。  
这不是“简单实现能跑就提交”。

每个 cycle 都必须完整执行：

```text
1. 审计当前 OpenCore
2. 对比 NestWeb
3. 对比 Antdpro6
4. 对比 RuoYi / ruoyi-vue-pro
5. 对比 Yudao / yudao-ui-admin-vue3
6. 生成覆盖阶段 1-6 的完整 backlog
7. 全部实现 backlog
8. 全部测试与评估通过
9. 写 completion report
10. 运行计数脚本 complete-cycle --run-gate
11. 计数 +1
12. 生成下一轮 cycle backlog
```

只有第 10 步成功，才算完成一个 cycle。

---

## 1. 目标范围：阶段 1-6

本轮长期目标覆盖以下 6 个功能阶段：

```text
1. 平台内核
2. 契约体系
3. OpenForge 代码生成器
4. 协同办公模块
5. 工作流 / 报表 / 任务
6. 集成能力
```

注意：用户后文提到“1-5 阶段”，但前文明确说“1-6 就是本次 goal 的目标”。执行时必须覆盖 1-6，不得遗漏第 6 阶段集成能力。

---

## 2. 必须参考的 4 个项目

每个 cycle 生成 backlog 前，必须参考：

```text
1. Gan-Xing/NestWeb
2. Gan-Xing/Antdpro6
3. RuoYi / ruoyi-vue-pro
4. Yudao / yudao-ui-admin-vue3
```

### 2.1 NestWeb 参考重点

必须看：

```text
docs/permission-model.md
docs/permissions.md
docs/openapi/nestweb.openapi.json
src/permissions/**
src/menus/**
src/messages/**
src/approval-requests/**
src/queue/**
src/system-log/**
prisma/schema.prisma
prisma/seed.ts
docs/development/message-center-integration.md
docs/handoff/ts-fullstack-s8-message-approval-export-handoff.md
```

复用经验：

```text
Role.code / Permission.code 稳定身份
权限与菜单分离
OpenAPI drift
消息中心
Approval Lite
系统日志
队列
文件/MinIO
部署与回滚文档
```

禁止：

```text
不复制旧业务代码
不迁移旧 schema
不照搬旧 auth/token
不把旧业务数据导入 OpenCore
```

### 2.2 Antdpro6 参考重点

必须看：

```text
src/access.ts
config/routes.ts
src/app.tsx
src/components/TableExportButton/**
src/components/ResultStates/**
src/pages/Dashboard/**
src/pages/Auth/Users/**
src/pages/Auth/Roles/**
src/pages/Auth/Permissions/**
src/pages/Auth/Menus/**
src/pages/System/Dicts/**
src/pages/System/Config/**
src/pages/System/Files/**
src/pages/System/SystemLogs/**
src/pages/Security/LoginLogs/**
src/pages/MessageCenter/**
src/pages/Approvals/Requests/**
src/services/nest-web/**
e2e/**
```

复用经验：

```text
Umi route organization
access 权限规则
request/session 处理
ProTable 页面结构
TableExportButton
MessageCenter 页面
Approval 页面
E2E smoke
异常页与空状态
```

禁止：

```text
不复制 React 18 / antd 5 旧代码
不污染 OpenCore 官方 Admin 菜单
不绕过 SDK 直接手写漂移 API 类型
```

### 2.3 RuoYi / ruoyi-vue-pro 参考重点

必须参考其能力地图，不复制 Java/Vue 实现：

```text
system
infra
monitor
tool
codegen
workflow
report
job
notice
mail
sms
oauth
pay
member
mall
crm
erp
mes
wms
iot
```

复用经验：

```text
模块分层
权限粒度
菜单组织
代码生成器
系统管理
监控工具
工作流/报表/任务作为 optional
业务包不进 core
```

### 2.4 Yudao / yudao-ui-admin-vue3 参考重点

必须参考其前端模块组织：

```text
system
infra
bpm/workflow
report
mall
member
crm
erp
iot
ai
login/auth
permission/menu
codegen UI
```

复用经验：

```text
前端模块菜单层级
列表/表单/详情交互
字典/配置使用方式
工作流页面组织
codegen 页面组织
```

禁止：

```text
不复制 Vue 代码
不把 Vue 路由结构硬搬到 Umi
不把 Java 后端模型照搬到 NestJS
```

---

## 3. 每轮必须输出的文件结构

每个 cycle 使用：

```text
docs/quality-cycle/
  ledger.md
  cycle-001/
    audit.md
    backlog.md
    implementation-notes.md
    completion-report.md
    reference-comparison.md
  cycle-002/
    ...
```

`backlog.md` 必须使用 checkbox：

```markdown
- [ ] backlog item
```

只有全部变成：

```markdown
- [x] backlog item
```

并且全仓 gate 通过，计数脚本才允许 +1。

---

## 4. 阶段 1：平台内核 Backlog 范围

阶段 1 当前已完成基础 API/Admin/RBAC/System/Monitor/Runtime，但仍需质量递归审计以下缺口。

每个 cycle 必须重新检查：

### 1.1 Auth / Session / RBAC

需要审计并补齐：

```text
登录接口是否生产可用
refresh token 是否需要
token 过期与错误码是否稳定
权限 guard 是否覆盖所有写接口
Role.code 是否永远是稳定身份
Permission.code 是否跨端一致
菜单权限与按钮权限是否分离
禁用用户是否立即失效
RBAC seed 是否幂等
RBAC repository 是否有 integration tests
RBAC Admin 页面是否覆盖 create/update/delete/export
RBAC SDK 是否与 OpenAPI 无漂移
```

初始 backlog 必须至少检查：

```text
core:user create/update/delete/export 是否完整
core:role create/update/delete/export 是否完整
core:permission create/update/delete/export 是否完整
core:menu create/update/delete/export 是否完整
权限矩阵测试是否覆盖正反例
```

### 1.2 System Management

需要审计并补齐：

```text
dict 类型和值是否完整 CRUD
config 是否区分 public/private/secret
config 是否防止敏感值泄漏
file asset 是否有 metadata + storageKey + checksum
file 是否有 MinIO/S3 对齐策略
audit log 是否由真实 interceptor 产生
login log 是否覆盖成功/失败
export preview 是否可复用
分页/过滤/排序是否一致
Admin 页面是否真实调用 SDK
```

### 1.3 Monitor / Tool

需要审计并补齐：

```text
status 是否覆盖 DB/Redis/BullMQ/S3/API version
queue read-only 是否有错误降级
version 是否有 commit/build/runtime 信息
OpenAPI drift 是否进入 gate
export protocol 是否可用于后续模块
敏感配置是否不暴露
Admin Monitor 页面是否有 smoke
```

### 1.4 Runtime / Observability

需要审计并补齐：

```text
request id / trace id 是否全链路
structured log 是否覆盖 error/write audit
生产 Swagger 是否受控
CORS/security header 是否有测试
Prisma disconnect 是否安全
Redis/S3 probe 是否有 timeout
```

---

## 5. 阶段 2：契约体系 Backlog 范围

阶段 2 当前已有 contracts/sdk/module-registry/openapi，但仍需强化。

每个 cycle 必须重新检查：

```text
OpenAPI snapshot 是否最新
OpenAPI drift check 是否失败可靠
sdk:generate 是否真实存在或协议已修正
SDK 是否覆盖全部 API
Admin 是否只通过 SDK/request typed client
Permission code 是否唯一、稳定、可废弃
Menu key 是否唯一、稳定、可废弃
Module registry 是否覆盖 stage/layer/status/priority/edition
OpenAPI tags 是否与 registry 对齐
breaking change report 是否存在
错误响应 contract 是否统一
分页/排序/过滤 contract 是否统一
上传/下载/export contract 是否统一
```

必须补齐或生成 backlog：

```text
contracts validators
permission deprecation policy
module admission checklist
registry → API tag drift check
registry → Admin route/access drift check
OpenAPI → SDK drift check
SDK generated/manual boundary
```

---

## 6. 阶段 3：OpenForge Backlog 范围

阶段 3 是最高优先级。当前 S9 只完成 read-only MVP。每个 cycle 必须检查 OpenForge 是否已达到 V1/V2 级别。

必须持续推进：

```text
contracts V1
schema/config DSL
template pack
virtual file system
safe apply writer
generated marker
manifest
rollback
patch plan
API skeleton generation
Admin skeleton generation
SDK generation
test generation
docs generation
doctor
gate
temp repo e2e
golden snapshot
```

必须保持安全边界：

```text
默认 dry-run
真实写入必须 --yes
只能创建新文件或更新带 OpenForge marker 的文件
人工文件只生成 patch plan
不直接写 prisma/schema.prisma
不创建 prisma/migrations
不覆盖 .env*
不生成 P4/P5 业务模块
```

OpenForge 必须最终服务阶段 4-6，而不是只给 core.dict 示例使用。

---

## 7. 阶段 4：协同办公 Backlog 范围

阶段 4 当前基本未实现。参考 NestWeb `messages`、`approval-requests` 和 Antdpro6 `MessageCenter`、`Approvals/Requests`。

必须覆盖：

### 4.1 Message

```text
collaboration.message registry entry
message Prisma model
message API
message SDK
message Admin page
read/unread
mark read
archive/delete policy
recipient model
system message vs user message
audit
permissions
tests
```

### 4.2 Notice / Announcement

```text
collaboration.notice registry entry
notice publish/draft/archive
target audience
valid time range
Admin ProTable
SDK
permissions
tests
```

### 4.3 Todo

```text
collaboration.todo registry entry
todo source type
todo businessType/businessId
assign/complete/cancel
status timeline
Admin page
SDK
permissions
tests
```

### 4.4 Approval Lite

```text
collaboration.approval-lite registry entry
approval request model
single-step approve/reject
businessType/businessId
idempotency
operator audit
comment
Admin page
SDK
permissions
tests
```

禁止：

```text
不实现完整 BPMN
不做流程设计器
不做复杂多级审批
```

---

## 8. 阶段 5：工作流 / 报表 / 任务 Backlog 范围

阶段 5 是 optional/monitor/tool 深化，不应一次性膨胀成低代码平台。

必须按可控顺序推进：

### 5.1 Job / Scheduler

```text
monitor.job 或 optional.job registry
job definition
job run log
manual trigger
enable/disable
read-only queue link
BullMQ adapter
retry policy
Admin page
SDK
permissions
tests
```

### 5.2 Cache / Online User

```text
monitor.cache registry
cache key prefix read-only listing
cache clear policy with permission
online-user registry
session/token activity view
kick-out policy if implemented
Admin page
tests
```

### 5.3 Report

```text
optional.report registry
report definition draft
report query schema
current-page export integration
async export design
Admin page skeleton
SDK
permissions
tests
```

### 5.4 Workflow Design Position

```text
optional.workflow registry
workflow admission doc
BPMN not implemented
approval-lite bridge
future extension contract
```

禁止：

```text
不做完整 BPMN
不做完整报表设计器
不做大数据异步导出，除非 file/job/permission/expiry/audit 已闭环
```

---

## 9. 阶段 6：集成能力 Backlog 范围

阶段 6 当前未实现。必须先做 provider 边界、凭据安全、审计和 outbox，不要直接堆供应商代码。

必须覆盖：

### 6.1 Integration Core

```text
integration provider registry
provider config model
secret reference model
credential redaction
provider health check
provider audit log
provider enable/disable
SDK/Admin
permissions
tests
```

### 6.2 Mail

```text
integration.mail
mail template
mail outbox
send log
retry policy
provider abstraction
preview
permissions
tests
```

### 6.3 SMS

```text
integration.sms
template
outbox
rate limit
send log
provider abstraction
verification-code safety design
permissions
tests
```

### 6.4 OAuth / Third-party Login

```text
integration.oauth
provider config
callback route contract
account binding
security state
audit
Admin page
tests
```

### 6.5 WeChat / WebSocket / Payment Provider

```text
integration.wechat design first
integration.websocket design first
integration.pay-provider design first
```

Payment 只做 provider 边界设计和 mock/sandbox，不直接做真实支付业务闭环，除非安全、审计、退款、回调幂等、对账边界完整。

---

## 10. Cycle 001 初始 Backlog

Cycle001 的详细 checklist 单独保存为：

```text
docs/quality-cycle/cycle-001/backlog.md
```

本 handoff 附带下载文件 `cycle001-backlog.md`，Codex 应复制到上述路径，或按其内容创建。

---

## 11. 计数脚本

脚本建议保存为：

```text
tools/quality-cycle/opencore-quality-cycle.mjs
```

使用方式：

```bash
node tools/quality-cycle/opencore-quality-cycle.mjs status --max 20
node tools/quality-cycle/opencore-quality-cycle.mjs start-cycle --max 20
node tools/quality-cycle/opencore-quality-cycle.mjs complete-cycle --max 20 --run-gate
```

规则：

```text
- 到达伦敦时间 2026-06-11 05:30 后拒绝继续完成 cycle。
- completedCycles >= max 后拒绝继续。
- 当前 backlog 中存在 `- [ ]` 时拒绝计数。
- completion-report.md 不存在时拒绝计数。
- --run-gate 失败时拒绝计数。
- 只有上述全部通过才 completedCycles +1。
```

---

## 12. 每个 Cycle 必须生成的 Backlog 标准

每个新的 backlog 必须覆盖阶段 1-6：

```text
1-platform-core
2-contract-system
3-openforge
4-collaboration
5-workflow-report-job
6-integration
```

每个 backlog item 必须包含：

```text
ID
阶段
问题
参考来源
涉及文件
实施要求
测试要求
完成标准
checkbox
```

不允许只写：

```text
- [ ] 优化代码
- [ ] 补测试
```

必须写成：

```text
- [ ] Q001-P2-OpenAPI-SDK-Drift：补齐 SDK generate/check 门禁。参考 NestWeb openapi check 与 OpenCore contracts；涉及 package.json、packages/sdk、docs/development/openapi-workflow.md；必须新增测试；完成标准为 pnpm openapi:check + SDK drift check 均通过。
```

---

## 13. 每个 Cycle 的 completion-report.md 标准

必须包含：

```text
cycle number
startedAt
completedAt
London time
backlog item count
completed item count
files changed
reference projects inspected
commands run
failed commands and fixes
remaining risks
next cycle audit suggestions
scope guard
```

---

## 14. 全仓 Gate

每个 cycle 完成时，至少执行：

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm prisma:validate
pnpm openapi:export
pnpm openapi:check
pnpm test:api
pnpm test:admin
NX_DAEMON=false pnpm nx test contracts
NX_DAEMON=false pnpm nx test module-registry
NX_DAEMON=false pnpm nx test sdk
```

如果 OpenForge 脚本存在，还必须执行：

```bash
pnpm openforge:check
pnpm openforge:doctor
pnpm openforge:gate
NX_DAEMON=false pnpm nx test openforge
NX_DAEMON=false pnpm nx build openforge
```

如果新增 collaboration / integration / job / report 相关项目，还必须增加对应 targeted tests。

---

## 15. Scope Guard

每个 cycle 都必须保证：

```text
No secrets committed.
No .env.opencore.local read into docs/output.
No P4/P5 industry module forced into core.
No RuoYi/Yudao Java/Vue code copied.
No NestWeb/Antdpro6 business code copied.
No generated code overwrote human-authored code without marker.
No Prisma destructive migration.
No payment/AI/RAG/Agent implemented without explicit later handoff.
```

---

## 16. 结束标准

停止条件：

```text
completedCycles >= 20
OR London time >= 2026-06-11 05:30
```

停止时必须输出：

```text
final completedCycles
latest cycle
latest backlog status
latest completion report
latest gate result
remaining backlog if any
recommended next handoff
```
