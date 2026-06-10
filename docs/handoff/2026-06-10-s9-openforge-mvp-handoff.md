# OpenCore S9 OpenForge MVP Handoff

更新时间：2026-06-10  
适用执行者：Codex / GPT-5.5 xhigh  
目标阶段：S9  
阶段主题：OpenForge MVP，只读生成计划与 Diff Plan  
执行状态：complete  
建议保存路径：`docs/handoff/2026-06-10-s9-openforge-mvp-handoff.md`

---

## 0. 当前项目状态

OpenCore 当前已经完成：

```text
S0/S1  品牌、monorepo 骨架、pnpm workspace、Nx、基础目录和文档
D1-D6  平台边界、模块分类、契约权限、API/Admin 启动计划、OpenForge/AI 边界
S2     apps/api NestJS 主干、health、OpenAPI skeleton；apps/admin Umi Max + Ant Design Pro 主干
S3     packages/shared、packages/contracts、packages/module-registry
S4     API config/env validation、request id、统一错误、日志、安全、OpenAPI export
S5     Admin Dashboard shell、异常页、request/access、registry 菜单消费
S6     Prisma/PostgreSQL、auth/RBAC、Role.code、Permission.code、RBAC API/SDK/Admin
S7     dict、system config、file asset、audit log、login log、系统管理 API/SDK/Admin
S8     status/version/queue、OpenAPI drift check、export protocol、Monitor/Tool 页面
R-1-R7 legacy freeze、runtime audit、env、PostgreSQL、Prisma persistence、Redis/BullMQ/MinIO diagnostics、integration smoke、final docs
```

当前最早未完成阶段是：

```text
S9 OpenForge MVP
```

S9 不属于业务模块阶段，而是 OpenCore 的“开发平台能力”阶段。它的价值是把未来模块开发从“人工复制 CRUD/API/Admin/SDK/权限/文档”升级成“先由 module registry + OpenAPI + manual schema 生成只读计划与 diff，再由人审查后进入后续写文件阶段”。

---

## 1. S9 总目标

实现 OpenForge MVP 的 **只读规划能力**：

```text
Input:
  - packages/module-registry
  - packages/contracts/openapi/opencore-api.json
  - manual schema
  - generator config

Output:
  - generate plan
  - diff plan
  - safety report
  - drift/preflight report
```

S9 只建立计划、校验、diff、安全策略和测试基础，不进入真实写文件生成器。

---

## 2. 为什么现在做 S9

OpenCore 已经具备平台内核：

- API 已有 RBAC、系统管理、监控、工具模块。
- Admin 已有 Dashboard、System、Security、Monitor、Tool 页面。
- contracts、sdk、module-registry 已经形成基础契约链路。
- Runtime 已接入 PostgreSQL、Redis、BullMQ、MinIO/S3 诊断。

现在如果继续直接写 S10 collaboration 或 optional/industry 模块，会导致后续模块继续手工同步：

```text
module registry
permission code
menu
OpenAPI tag
DTO / controller / service
SDK client
Admin route
Admin access
Admin page
tests
docs
```

这会快速产生漂移。S9 的正确位置是在业务扩张前，先把“模块生成计划系统”建立起来。

---

## 3. S9 明确范围

### 允许做

- 新增 `tool.openforge` module registry 声明。
- 新增 OpenForge contracts。
- 新增 `tools/generator` workspace tool。
- 新增 OpenForge CLI：
  - `pnpm openforge:plan`
  - `pnpm openforge:diff`
  - `pnpm openforge:check`
- 读取 module registry。
- 读取 OpenAPI snapshot。
- 读取 manual schema。
- 输出 dry-run generate plan。
- 输出 readonly diff plan。
- 输出 safety / preflight report。
- 编写 tests。
- 更新 README、docs、handoff、progress。
- 可选新增 Admin `/tools/openforge` 只读状态页。

### 禁止做

- 不写生成目标文件。
- 不覆盖人工文件。
- 不生成业务逻辑。
- 不写 Prisma schema。
- 不创建 Prisma migration。
- 不实现完整 SDK generator。
- 不实现完整 Admin generator。
- 不实现完整任务平台。
- 不实现大数据异步导出。
- 不实现 P4/P5 模块。
- 不实现 CRM、ERP、MES、WMS、商城、支付、会员、多租户。
- 不实现 Knowledge、RAG、Agent、AI workflow。
- 不复制 RuoYi/Yudao Java/Vue 代码。
- 不迁移 NestWeb / Antdpro6 业务代码。
- 不读取、输出、提交 `.env.opencore.local` 或任何 secret。

---

## 4. 必读文件

每轮执行前必须读取：

```text
README.md
docs/README.md
docs/strategy/README.md
docs/strategy/progress.md
docs/strategy/staged-roadmap.md
docs/strategy/opencore-target-vision.md
docs/strategy/legacy-reuse-audit.md
docs/modules/module-registry.md
docs/modules/priority-roadmap.md
docs/development/contract-and-permission-standard.md
docs/development/openforge-roadmap.md
docs/development/generator-roadmap.md
docs/handoff/README.md
docs/runtime/runtime-inventory.md
docs/runtime/opencore-env-mapping.md
packages/contracts/src/module-contract.ts
packages/contracts/src/permission-code.ts
packages/contracts/src/openapi-contract.ts
packages/contracts/src/index.ts
packages/module-registry/src/modules.ts
packages/module-registry/src/registry.ts
packages/contracts/openapi/opencore-api.json
package.json
pnpm-workspace.yaml
nx.json
tsconfig.base.json
```

创建本 handoff 文件后，后续循环也必须读取：

```text
docs/handoff/2026-06-10-s9-openforge-mvp-handoff.md
```

---

## 5. 执行循环协议

每个子阶段都按以下循环执行：

```text
1. 读取相关代码和文档。
2. 识别当前最早未完成的 S9 子阶段。
3. 只实施该子阶段，不扩大范围。
4. 编写或更新测试。
5. 运行该子阶段要求的检查。
6. 修复失败。
7. 更新相关文档。
8. 更新 docs/strategy/progress.md。
9. 检查 handoff 剩余内容。
10. 自动进入下一子阶段。
```

不得完成一个小改动后停止并要求重新规划。必须持续推进到 S9 handoff 全部完成，或遇到真实阻塞并在 `progress.md` 中记录证据。

---

## 6. Stage A：登记 `tool.openforge`

### 目标

把 OpenForge 作为正式 tool 模块登记到 module registry。

### 原因

OpenForge 会影响 API、Admin、SDK、权限、菜单、文档和测试。它必须先进入 module registry，不能成为脱离架构的临时脚本。

### 涉及文件

```text
packages/module-registry/src/modules.ts
packages/module-registry/src/registry.ts
packages/module-registry/src/index.spec.ts
docs/modules/module-registry.md
docs/modules/priority-roadmap.md
docs/development/openforge-roadmap.md
docs/strategy/progress.md
```

### 实施要求

新增模块：

```ts
code: 'tool.openforge';
title: 'OpenForge';
layer: 'tool';
priority: 'P0';
stage: 'S9';
enabledByDefault: true;
apiTags: ['Tool OpenForge'];
```

新增权限：

```text
tool:openforge:read
tool:openforge:manage
```

新增菜单：

```text
key: tools.openforge
path: /tools/openforge
permissionCode: tool:openforge:read
```

`tool:openforge:manage` 在 S9 只代表允许运行 dry-run/diff/check，不代表写文件。

### 测试

```bash
NX_DAEMON=false pnpm nx test module-registry
pnpm typecheck
pnpm lint
pnpm format:check
```

### 完成标准

- `listModules()` 可查到 `tool.openforge`。
- `collectPermissionCodes()` 可查到 OpenForge 权限。
- registry validation 通过。
- P4/P5 guard 仍通过。
- 文档和 progress 已更新。

---

## 7. Stage B：OpenForge contracts 与 workspace package

### 目标

把 OpenForge 建成正式 workspace tool，而不是零散脚本。

### 涉及文件

```text
tools/generator/**
packages/contracts/src/openforge-contract.ts
packages/contracts/src/index.ts
package.json
tsconfig.base.json
pnpm-workspace.yaml
nx.json
```

### 实施要求

在 `tools/generator` 下创建正式工具包：

```text
package name: @opencore/openforge
Nx project name: openforge
```

建议新增：

```text
tools/generator/package.json
tools/generator/project.json
tools/generator/tsconfig.json
tools/generator/tsconfig.lib.json
tools/generator/jest.config.ts
tools/generator/src/index.ts
tools/generator/src/cli.ts
tools/generator/README.md
```

新增 contract：

```text
packages/contracts/src/openforge-contract.ts
```

至少包含：

```ts
OpenForgeManualSchema;
OpenForgeFieldSchema;
OpenForgePlan;
OpenForgeArtifactPlan;
OpenForgeDiffPlan;
OpenForgeSafetyPolicy;
OpenForgeInputSnapshot;
OpenForgeValidationIssue;
OpenForgePlanFormat;
```

更新：

```text
packages/contracts/src/index.ts
```

新增 root scripts：

```json
"openforge:plan": "...",
"openforge:diff": "...",
"openforge:check": "..."
```

### 测试

```bash
pnpm format:check
pnpm lint
pnpm typecheck
NX_DAEMON=false pnpm nx test contracts
NX_DAEMON=false pnpm nx test openforge
NX_DAEMON=false pnpm nx build openforge
```

### 完成标准

- OpenForge 是 pnpm workspace/Nx 可识别项目。
- contracts 导出 OpenForge contract。
- root scripts 可调用 CLI。
- 没有任何写生成目标文件能力。
- progress 已更新。

---

## 8. Stage C：输入读取器与校验器

### 目标

实现 OpenForge 的三个只读输入读取器：

```text
module registry reader
OpenAPI snapshot reader
manual schema loader
```

### 涉及文件

```text
tools/generator/src/readers/**
tools/generator/src/validators/**
tools/generator/examples/**
packages/contracts/openapi/opencore-api.json
packages/contracts/src/permission-code.ts
```

### 实施要求

#### module registry reader

读取：

```ts
listModules();
collectMenus();
collectPermissionDefinitions();
validateModuleRegistry();
```

#### OpenAPI reader

读取：

```text
packages/contracts/openapi/opencore-api.json
```

提取：

```text
paths
methods
operationId
tags
schemas
```

#### manual schema loader

新增示例：

```text
tools/generator/examples/core.dict.schema.json
```

manual schema 至少表达：

```text
moduleCode
resource
title
description
fields
list
form
detail
actions
permissions
openapi
admin
```

### 校验规则

- `moduleCode` 必须存在于 registry。
- permission 必须满足 `<module-layer>:<resource>:<action>`。
- permission 必须符合 `PermissionCode`。
- schema permissions 必须与 module/layer/resource 对齐。
- OpenAPI tag 必须与 registry `apiTags` 对齐；strict 模式下 mismatch 失败。
- schema 不得指向 forbidden P4/P5 module。
- schema 不得请求写 Prisma schema。
- target path 必须 repo-relative。
- 禁止绝对路径。
- 禁止 `../` traversal。

### 测试 fixture

新增非法 fixture：

```text
invalid-p4-module.schema.json
invalid-permission-code.schema.json
missing-openapi-tag.schema.json
```

### 测试

```bash
NX_DAEMON=false pnpm nx test openforge
NX_DAEMON=false pnpm nx test module-registry
NX_DAEMON=false pnpm nx test contracts
pnpm typecheck
pnpm lint
```

### 完成标准

- 合法 schema 可读取。
- 非法 permission 失败。
- P4/P5 module schema 失败。
- OpenAPI tag mismatch 有明确 issue。
- 所有读取器只读。
- progress 已更新。

---

## 9. Stage D：Generate Plan 引擎

### 目标

实现 deterministic generate plan。

### 涉及文件

```text
tools/generator/src/planner/**
tools/generator/src/hash/**
tools/generator/src/output/**
packages/contracts/src/openforge-contract.ts
```

### Plan 必须包含

```text
moduleCode
templateVersion
inputSnapshot
schemaHash
openApiSnapshotHash
registrySnapshotHash
artifacts
permissions
menus
openapiTags
warnings
errors
nextCommands
safety
```

### artifact 类型建议

```text
api.module
api.controller
api.service
api.dto
api.repository
admin.listPage
admin.form
admin.detail
sdk.client
test.api
test.admin
docs.fragment
prisma.hint
```

`prisma.hint` 只能是提示，不得输出完整 Prisma schema，不得创建 migration。

### 每个 artifact 必须包含

```text
targetPath
kind
action
protected
overwritePolicy
contentPreview 或 contentHash
reason
```

### CLI

```bash
pnpm openforge:plan -- --schema tools/generator/examples/core.dict.schema.json --format json
pnpm openforge:plan -- --schema tools/generator/examples/core.dict.schema.json --format markdown
```

### 测试

```bash
pnpm openforge:plan -- --schema tools/generator/examples/core.dict.schema.json --format json
pnpm openforge:plan -- --schema tools/generator/examples/core.dict.schema.json --format markdown
NX_DAEMON=false pnpm nx test openforge
pnpm typecheck
pnpm lint
```

### 完成标准

- 同一输入重复运行 plan 输出稳定。
- plan 不写目标文件。
- plan 清楚列出 API/Admin/SDK/Test/Docs/Prisma hint artifact。
- artifact 均有 reason 与 safety policy。
- progress 已更新。

---

## 10. Stage E：Diff Plan 与安全策略

### 目标

实现 readonly diff plan 与安全覆盖策略。

### 涉及文件

```text
tools/generator/src/diff/**
tools/generator/src/safety/**
tools/generator/src/output/**
tools/generator/src/__tests__/**
```

### diff status

至少支持：

```text
would-create
would-update
unchanged
blocked
protected-conflict
```

### protected paths

必须保护：

```text
.env
.env.*
.env.opencore.local
prisma/schema.prisma
prisma/migrations/**
```

### 安全规则

- 禁止绝对路径。
- 禁止 `../`。
- 禁止 repo 外路径。
- S9 永远不写目标文件。
- 命中 protected path 必须 blocked 或 protected-conflict。
- 无 generated marker 的已存在文件必须 protected-conflict。

### CLI

```bash
pnpm openforge:diff -- --schema tools/generator/examples/core.dict.schema.json --format json
pnpm openforge:check
```

### 测试

```bash
pnpm openforge:diff -- --schema tools/generator/examples/core.dict.schema.json --format json
pnpm openforge:check
NX_DAEMON=false pnpm nx test openforge
pnpm format:check
pnpm lint
pnpm typecheck
```

### 完成标准

- diff plan 能正确区分 create/update/unchanged/blocked/conflict。
- protected path 被拦截。
- path traversal 被拒绝。
- no-write 测试通过。
- idempotency 测试通过。
- progress 已更新。

---

## 11. Stage F：文档、状态入口与最终门禁

### 目标

把 S9 变成可交接、可继续迭代、可验证的阶段成果。

### 涉及文件

```text
README.md
docs/README.md
docs/development/openforge-roadmap.md
docs/development/generator-roadmap.md
docs/modules/module-registry.md
docs/modules/priority-roadmap.md
docs/handoff/README.md
docs/handoff/2026-06-10-s9-openforge-mvp-handoff.md
docs/strategy/README.md
docs/strategy/progress.md
tools/generator/README.md
```

可选：

```text
apps/admin/src/pages/Tools/OpenForge/**
apps/admin/.umirc.ts
apps/admin/src/access.ts
```

### 实施要求

- 新增本 Handoff 文件。
- 更新 Handoff index。
- 更新 OpenForge roadmap。
- 更新 generator roadmap。
- 更新 module registry docs。
- 更新 priority roadmap。
- 更新 README/docs README。
- 更新 strategy README。
- 更新 progress ledger。
- 可选新增 `/tools/openforge` Admin 只读说明页：
  - 只能展示 scope、CLI、safety rules。
  - 不执行 generator。
  - 不接收任意文件路径。
  - 不读取本地 env。

### 最终必跑门禁

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm openapi:export
pnpm openapi:check
NX_DAEMON=false pnpm nx test contracts
NX_DAEMON=false pnpm nx test module-registry
NX_DAEMON=false pnpm nx test openforge
NX_DAEMON=false pnpm nx build openforge
pnpm openforge:plan -- --schema tools/generator/examples/core.dict.schema.json --format json
pnpm openforge:diff -- --schema tools/generator/examples/core.dict.schema.json --format json
pnpm openforge:check
```

如果新增 Admin 页面，还必须运行：

```bash
pnpm test:admin
pnpm build:admin
```

### 完成标准

- `tool.openforge` 已注册。
- OpenForge contracts 已导出。
- `tools/generator` 是正式 workspace/Nx tool。
- `openforge:plan` 可输出 deterministic plan。
- `openforge:diff` 可输出 readonly diff plan。
- `openforge:check` 可验证 registry/OpenAPI/schema/preflight。
- 没有写生成目标文件。
- 没有修改 Prisma schema。
- P4/P5 schema 输入被拒绝。
- protected paths 被阻止。
- 文档和 progress 已更新。
- S9 完成后可以进入：
  - P1 OpenForge CI/gate hardening，或
  - S10 collaboration。

---

## 12. progress.md 更新格式

每个 Stage 完成后追加：

```markdown
### 2026-06-10 S9 Stage X execution

- Stage: S9 Stage X - <name>
- Completed:
  - ...
- Tests:
  - `pnpm ...` pass
- Files changed:
  - ...
- Remaining:
  - ...
- Next:
  - ...
- Scope guard:
  - No generated target files written.
  - No Prisma schema or migration generated.
  - No P4/P5 module implemented.
  - No secrets read, printed, or committed.
```

---

## 13. 推荐 commit summary

```text
feat(openforge): add read-only S9 generate and diff planning

中文：实现 S9 OpenForge 只读生成计划与 diff plan MVP，接入 module registry、OpenAPI、manual schema、contracts、CLI、测试和文档；不写生成目标文件、不修改 Prisma schema、不实现 P4/P5 模块。
English: Implement the S9 OpenForge read-only generate-plan and diff-plan MVP with module registry, OpenAPI, manual schema, contracts, CLI, tests, and docs; do not write generated target files, modify Prisma schema, or implement P4/P5 modules.

Tests:
- ...
```
