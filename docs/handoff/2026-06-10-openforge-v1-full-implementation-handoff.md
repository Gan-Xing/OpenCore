# OpenCore OpenForge V1 Full Implementation Handoff

更新时间：2026-06-10  
适用执行者：Codex / GPT-5.5 xhigh  
建议保存路径：`docs/handoff/2026-06-10-openforge-v1-full-implementation-handoff.md`  
目标：把 OpenForge 从 S9 只读 MVP 推进到 V1 完整、安全、可回滚、可测试、可持续维护的生成器能力。

---

## 0. 当前真实状态

OpenCore 已完成：

```text
S0/S1  monorepo foundation
D1-D6  startup design
S2     apps/api + apps/admin bootstrap
S3     shared / contracts / module-registry
S4     API foundation
S5     Admin shell
S6     auth / RBAC
S7     system management
S8     monitor / tool baseline
S9     OpenForge read-only MVP
R-1-R7 runtime integration
```

当前 OpenForge 已具备：

```text
tool.openforge module registry entry
packages/contracts OpenForge contract
tools/generator workspace tool
pnpm openforge:plan
pnpm openforge:diff
pnpm openforge:check
read-only input readers
deterministic generate plan
readonly diff plan
safety / preflight report
protected path blocking
P4/P5 schema rejection
```

当前 OpenForge 仍缺少：

```text
safe apply writer
generated marker protocol
manifest
rollback
template pack system
real generated file rendering
API skeleton generation
Admin skeleton generation
SDK client generation
test skeleton generation
docs fragment generation
route/access/registry patch strategy
schema/config DSL hardening
golden snapshot tests
end-to-end generator integration tests
CI gate
developer runbook
OpenForge V1 completion docs
```

因此下一阶段不是再做一个 MVP，而是直接推进 **OpenForge V1 Full Implementation**。

---

## 1. 总目标

OpenForge V1 要完成从“只读计划器”到“生产级安全生成器”的完整闭环：

```text
manual schema
  + module registry
  + OpenAPI snapshot
  + generator config
  + template pack
        ↓
   OpenForge plan
        ↓
   OpenForge diff
        ↓
   OpenForge apply
        ↓
   manifest + audit record
        ↓
   rollback support
        ↓
   generated API/Admin/SDK/Test/Docs assets
        ↓
   full verification gate
```

V1 的目标不是生成一两个文件，而是把 OpenForge 变成后续 S10、S11、S12、optional、integration、industry 模块都能复用的长期开发平台能力。

---

## 2. V1 成功标准

OpenForge V1 完成时必须满足：

1. 有完整 contracts：
   - template contract
   - apply contract
   - manifest contract
   - rollback contract
   - generated marker contract
   - patch plan contract
   - generator config contract

2. 有完整 CLI：
   - `pnpm openforge:plan`
   - `pnpm openforge:diff`
   - `pnpm openforge:check`
   - `pnpm openforge:apply`
   - `pnpm openforge:rollback`
   - `pnpm openforge:manifest`
   - `pnpm openforge:doctor`

3. 有安全写入能力：
   - 默认仍 dry-run
   - apply 必须显式开启
   - 只能写 repo 内安全路径
   - 只能创建新文件或更新带 OpenForge generated marker 的文件
   - 不能覆盖人工文件
   - 不能写 `.env*`
   - 不能写 `prisma/schema.prisma`
   - 不能写 `prisma/migrations/**`
   - 不能写 repo 外路径
   - 不能使用 `../` path traversal
   - 每次 apply 必须生成 manifest
   - rollback 只能回滚 manifest 中 OpenForge 创建或更新的文件

4. 有模板包：
   - NestJS API module/controller/service/dto/repository skeleton
   - Admin ProTable page skeleton
   - ModalForm / DrawerForm skeleton
   - ProDescriptions detail skeleton
   - TableExportButton operation skeleton
   - SDK client skeleton
   - API test skeleton
   - Admin smoke/test skeleton
   - docs fragment
   - Prisma model draft / migration hint，注意只生成 draft/hint，不直接修改 Prisma schema

5. 有 patch strategy：
   - 对手写入口文件只生成 patch plan，不直接改
   - 例如 `apps/api/src/app/app.module.ts`、`apps/admin/.umirc.ts`、`apps/admin/src/access.ts`、`packages/module-registry/src/modules.ts`
   - patch plan 必须说明人工插入点、原因、风险、验证命令
   - 除非文件带 generated marker，否则不能自动改

6. 有测试：
   - contract tests
   - schema validation tests
   - template golden snapshot tests
   - plan/diff/apply/rollback tests
   - no-write dry-run tests
   - protected path tests
   - generated marker tests
   - idempotency tests
   - P4/P5 rejection tests
   - temp repo e2e tests
   - CLI tests

7. 有文档：
   - OpenForge V1 architecture
   - template authoring guide
   - schema authoring guide
   - apply / rollback runbook
   - generated marker policy
   - patch review guide
   - CI gate guide
   - progress ledger
   - handoff index update
   - roadmap update

---

## 3. 严格边界

### 允许

- 实现 OpenForge 安全写入生成器。
- 创建 generated-owned files。
- 在 temp repo 或 explicit output root 中做 apply/rollback e2e。
- 在真实 repo 中新增 OpenForge 自身代码、测试、docs、fixtures。
- 生成 templates、fixtures、expected snapshots。
- 新增 `openforge:apply`、`openforge:rollback`、`openforge:manifest`、`openforge:doctor`。
- 生成 Prisma draft 或 migration hint 文件。
- 生成 patch plan。
- 生成 API/Admin/SDK/Test/Docs skeleton。
- 更新 README/docs/progress/handoff/roadmap。

### 禁止

- 不覆盖人工文件。
- 不自动修改没有 generated marker 的既有业务代码。
- 不直接写 `prisma/schema.prisma`。
- 不创建真实 Prisma migration。
- 不读取、输出、提交 `.env.opencore.local` 或任何 secret。
- 不实现 CRM、ERP、MES、WMS、商城、支付、会员、多租户。
- 不实现 Knowledge、RAG、Agent、AI workflow。
- 不复制 RuoYi/Yudao Java/Vue 代码。
- 不迁移 NestWeb/Antdpro6 业务代码。
- 不把 OpenForge 变成低质量字符串拼接脚本。
- 不为了快速通过测试删除安全限制。
- 不为了演示方便关闭 protected path 检查。
- 不把 generated code 混进 core 现有手写模块。

---

## 4. 必读文件

每轮必须读取：

```text
README.md
docs/README.md
docs/handoff/README.md
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
docs/handoff/2026-06-10-s9-openforge-mvp-handoff.md
packages/contracts/src/openforge-contract.ts
packages/contracts/src/module-contract.ts
packages/contracts/src/permission-code.ts
packages/contracts/src/openapi-contract.ts
packages/contracts/src/index.ts
packages/module-registry/src/modules.ts
packages/module-registry/src/registry.ts
packages/contracts/openapi/opencore-api.json
tools/generator/README.md
tools/generator/package.json
tools/generator/project.json
tools/generator/src/cli.ts
tools/generator/src/index.ts
tools/generator/src/planner/**
tools/generator/src/diff/**
tools/generator/src/preflight/**
tools/generator/src/safety/**
tools/generator/src/readers/**
tools/generator/src/validators/**
tools/generator/examples/**
package.json
pnpm-workspace.yaml
nx.json
tsconfig.base.json
```

本文件创建后，后续循环也必须读取：

```text
docs/handoff/2026-06-10-openforge-v1-full-implementation-handoff.md
```

---

## 5. 执行循环

每个 Stage 都按以下循环执行：

```text
1. 阅读相关代码和文档。
2. 判断当前最早未完成 Stage。
3. 只实施当前 Stage。
4. 编写或更新测试。
5. 运行该 Stage 要求的检查。
6. 修复失败。
7. 更新 docs/strategy/progress.md。
8. 更新相关文档。
9. 如 Stage 完成，commit。
10. 继续进入下一 Stage。
```

不得只完成一个子任务后停止重新规划。不得把一个阶段拆成几个小 goal 挤牙膏。当前 handoff 的目标是让 Codex 连续工作数小时，直到 OpenForge V1 完整落地。

---

## 6. Stage A：V1 架构审计与现状固化

### 目标

确认 S9 当前实现边界，补一份 OpenForge V1 architecture 文档，把 V1 目标从 MVP 明确升级为完整生成器。

### 涉及文件

```text
docs/development/openforge-v1-architecture.md
docs/development/openforge-roadmap.md
docs/strategy/progress.md
tools/generator/README.md
```

### 实施步骤

1. 审计当前 OpenForge：
   - CLI commands
   - contracts
   - safety policy
   - plan/diff/check behavior
   - tests
   - examples
2. 新增 `docs/development/openforge-v1-architecture.md`。
3. 说明 V1 架构：
   - contract layer
   - schema/config layer
   - reader layer
   - planner layer
   - template layer
   - virtual file system layer
   - diff layer
   - apply layer
   - manifest layer
   - rollback layer
   - CI gate layer
4. 在 roadmap 中新增 “OpenForge V1 Full Implementation”。
5. 在 progress 中记录 Stage A。

### 测试

```bash
pnpm format:check
pnpm lint
pnpm typecheck
NX_DAEMON=false pnpm nx test openforge
```

### 完成标准

- 有 V1 architecture 文档。
- roadmap 从 S9 MVP 延伸到 V1 完整生成器。
- progress 记录完成。
- 未实现写文件前不得引入 apply 命令。

---

## 7. Stage B：Contracts V1 升级

### 目标

把 OpenForge contracts 从 S9 read-only 扩展为 V1 生成器协议。

### 涉及文件

```text
packages/contracts/src/openforge-contract.ts
packages/contracts/src/index.ts
packages/contracts/src/index.spec.ts
tools/generator/src/**
```

### 必须新增或扩展的类型

```ts
OpenForgeTemplatePack;
OpenForgeTemplateDefinition;
OpenForgeTemplateRenderContext;
OpenForgeGeneratedMarker;
OpenForgeApplyMode;
OpenForgeApplyRequest;
OpenForgeApplyResult;
OpenForgeManifest;
OpenForgeManifestEntry;
OpenForgeRollbackRequest;
OpenForgeRollbackPlan;
OpenForgeRollbackResult;
OpenForgePatchPlan;
OpenForgePatchEntry;
OpenForgeGeneratorConfig;
OpenForgeOutputPolicy;
OpenForgeWritePolicy;
OpenForgeGeneratedFile;
OpenForgeVirtualFile;
OpenForgeArtifactContent;
```

### 关键协议要求

1. 生成文件必须包含 marker：

   ```text
   @generated by OpenForge
   templateVersion
   schemaHash
   moduleCode
   artifactKind
   generatedAt
   ```

2. marker 必须可解析。
3. 只有带合法 marker 的文件允许自动更新。
4. apply 必须写 manifest。
5. rollback 只依据 manifest 执行。
6. manifest 必须包含：
   - id
   - createdAt
   - command
   - schemaPath
   - moduleCode
   - templateVersion
   - input hashes
   - entries
   - beforeHash
   - afterHash
   - action
   - rollback action
7. contracts 不允许依赖 Node fs。

### 测试

```bash
NX_DAEMON=false pnpm nx test contracts
pnpm typecheck
pnpm lint
pnpm format:check
```

### 完成标准

- contracts 可表达 plan/diff/apply/manifest/rollback/template/config。
- tests 覆盖 marker、manifest、apply policy。
- 不破坏 S9 plan/diff/check。

---

## 8. Stage C：Schema 与 Generator Config DSL 强化

### 目标

让 manual schema 不再只是简单示例，而是可支撑 API/Admin/SDK/Test/Docs 生成的正式 DSL。

### 涉及文件

```text
tools/generator/src/schema/**
tools/generator/src/config/**
tools/generator/examples/**
tools/generator/src/validators/**
packages/contracts/src/openforge-contract.ts
```

### Schema V1 必须支持

```text
moduleCode
resource
title
description
fields
relations
indexes as hints
list
filter
sort
form
detail
actions
permissions
openapi
admin
sdk
tests
docs
export
storage
audit
```

### 字段类型

至少支持：

```text
string
text
number
boolean
datetime
enum
json
relation
file
```

### 配置 DSL 必须支持

```text
templatePack
templateVersion
outputRoot
applyMode
overwritePolicy
generatedMarkerRequired
protectedPaths
manualPatchOnlyPaths
allowedArtifactKinds
blockedArtifactKinds
strictOpenApiTags
strictPermissionCodes
```

### 实施要求

1. 新增 schema validator。
2. 新增 config loader。
3. 增加合法 fixture：
   - `tools/generator/examples/core.dict.v1.schema.json`
   - `tools/generator/examples/tool.openapi.v1.schema.json`
4. 增加非法 fixture：
   - P4/P5 module
   - invalid path traversal
   - invalid permission
   - Prisma write request
   - missing registry module
   - missing OpenAPI tag
5. 保持旧 `core.dict.schema.json` 兼容或提供迁移说明。

### 测试

```bash
NX_DAEMON=false pnpm nx test openforge
pnpm typecheck
pnpm lint
```

### 完成标准

- Schema V1 可表达完整 CRUD skeleton。
- Config 可控制输出、模板和安全策略。
- 非法输入全部失败。
- 旧示例不被破坏，或有明确 migration note。

---

## 9. Stage D：Template Pack 与 Virtual File System

### 目标

建立可维护模板系统，禁止把生成器写成一堆不可测试字符串。

### 涉及文件

```text
tools/generator/src/templates/**
tools/generator/src/render/**
tools/generator/src/vfs/**
tools/generator/src/hash/**
tools/generator/src/output/**
```

### 模板包

新增默认模板包：

```text
openforge-default-nest-umi-v1
```

模板分组：

```text
api/
  module
  controller
  service
  dto
  repository
  spec

admin/
  pro-table-page
  modal-form
  drawer-form
  descriptions
  export-button
  smoke-test

sdk/
  client
  types
  spec

docs/
  module-doc
  api-doc
  admin-doc
  runbook

prisma/
  model-draft
  migration-hint

patch/
  app-module-patch
  admin-route-patch
  admin-access-patch
  module-registry-patch
```

### Virtual File System

实现：

```ts
renderTemplatePack(schema, config): OpenForgeVirtualFile[]
```

每个 virtual file 必须包含：

```text
targetPath
artifactKind
content
contentHash
marker
isGenerated
isPatchOnly
reason
```

### 规则

- 模板输出必须 deterministic。
- 所有生成文件必须可 Prettier 格式化。
- patch 类型只输出 `.patch.md` 或 patch plan，不直接改人工文件。
- Prisma 只输出 draft/hint，不写 schema/migration。
- 文件路径必须经过 safety validator。

### 测试

```bash
NX_DAEMON=false pnpm nx test openforge
pnpm format:check
pnpm typecheck
pnpm lint
```

### 完成标准

- 有默认模板包。
- VFS 可渲染全部 artifact。
- Golden snapshot 覆盖每类模板。
- 输出稳定。

---

## 10. Stage E：Safe Apply Writer

### 目标

实现生产级安全写入，不再只停留在 plan/diff。

### CLI

新增：

```bash
pnpm openforge:apply -- --schema <schema> --config <config> --dry-run
pnpm openforge:apply -- --schema <schema> --config <config> --yes
```

### 安全写入协议

1. 默认 `--dry-run`。
2. 真实写入必须显式 `--yes`。
3. 真实写入前必须重新执行：
   - schema validation
   - config validation
   - module registry validation
   - OpenAPI tag validation
   - safety validation
   - diff validation
4. 可创建新文件。
5. 只能更新带合法 OpenForge marker 的文件。
6. 人工文件必须 `protected-conflict`。
7. protected paths 永远 blocked。
8. 写入必须是 two-phase：
   - prepare
   - validate
   - write
   - verify
   - manifest
9. 如果写入失败，必须回滚本次已写文件。
10. 写入后必须执行 content hash verify。

### Manifest

每次 apply 生成：

```text
.openforge/manifests/<timestamp>-<moduleCode>-<shortHash>.json
```

manifest 不得包含 secret。

### 测试

```bash
NX_DAEMON=false pnpm nx test openforge
pnpm openforge:apply -- --schema tools/generator/examples/core.dict.v1.schema.json --dry-run
pnpm typecheck
pnpm lint
```

### 完成标准

- dry-run 不写文件。
- `--yes` 在 temp repo e2e 中可写 generated files。
- 人工文件不被覆盖。
- marker 文件可更新。
- manifest 可生成。
- protected paths 被阻止。
- 失败可回滚本次操作。

---

## 11. Stage F：Rollback Engine

### 目标

实现基于 manifest 的 rollback。

### CLI

```bash
pnpm openforge:rollback -- --manifest .openforge/manifests/<id>.json --dry-run
pnpm openforge:rollback -- --manifest .openforge/manifests/<id>.json --yes
pnpm openforge:manifest -- --list
pnpm openforge:manifest -- --show <id>
```

### rollback 规则

1. 默认 dry-run。
2. 真实 rollback 必须 `--yes`。
3. rollback 只能处理 manifest 记录的文件。
4. 只能删除本次创建且仍带合法 marker 的文件。
5. 只能还原本次更新且仍带合法 marker 的文件。
6. 如果文件被人工修改过，必须 blocked，不能强行回滚。
7. rollback 自身也要写 rollback manifest 或 audit record。
8. 不允许 rollback `.env*`、Prisma schema、migrations。

### 测试

```bash
NX_DAEMON=false pnpm nx test openforge
pnpm typecheck
pnpm lint
```

### 完成标准

- rollback dry-run 可展示回滚计划。
- temp repo e2e 可 apply 再 rollback。
- 人工修改后的 generated file 不被强制回滚。
- rollback manifest/audit 可追踪。

---

## 12. Stage G：API Generator Pack

### 目标

生成 NestJS API skeleton。

### 生成物

```text
apps/api/src/modules/generated/<layer>/<resource>/<resource>.module.ts
apps/api/src/modules/generated/<layer>/<resource>/<resource>.controller.ts
apps/api/src/modules/generated/<layer>/<resource>/<resource>.service.ts
apps/api/src/modules/generated/<layer>/<resource>/<resource>.repository.ts
apps/api/src/modules/generated/<layer>/<resource>/<resource>.dto.ts
apps/api/src/modules/generated/<layer>/<resource>/<resource>.spec.ts
```

### 必须满足

- Controller 使用 `@ApiTags`。
- Controller 使用 `@RequirePermission`。
- DTO 有 Swagger decorators。
- Service 不直接访问 Prisma。
- Repository 是 interface 或 generated placeholder。
- 不生成真实业务逻辑。
- 不修改 `app.module.ts`，只生成 patch plan。
- patch plan 说明如何人工注册 module。
- 所有文件带 generated marker。
- 代码可 typecheck。

### 测试

```bash
NX_DAEMON=false pnpm nx test openforge
NX_DAEMON=false pnpm nx build openforge
pnpm typecheck
pnpm lint
```

### 完成标准

- API skeleton 模板完整。
- golden snapshots 覆盖。
- temp repo apply 后 API generated files 可 typecheck。
- app.module integration 只生成 patch plan。

---

## 13. Stage H：Admin Generator Pack

### 目标

生成 Umi Max + Ant Design Pro V6 + ProComponents v3 + antd 6 页面骨架。

### 生成物

```text
apps/admin/src/pages/Generated/<Resource>/index.tsx
apps/admin/src/pages/Generated/<Resource>/components/<Resource>Form.tsx
apps/admin/src/pages/Generated/<Resource>/components/<Resource>Detail.tsx
apps/admin/src/pages/Generated/<Resource>/<Resource>.smoke.spec.ts
```

### 必须包含

- ProTable list page。
- ModalForm 或 DrawerForm。
- ProDescriptions detail。
- TableExportButton 操作骨架。
- SDK client 调用占位。
- loading/error/empty state。
- permission-aware operation buttons。
- generated marker。

### 禁止

- 不直接修改 `.umirc.ts`。
- 不直接修改 `access.ts`。
- 不写真实业务接口调用到不存在 endpoint，除非通过 generated SDK placeholder。
- 不引入模板 demo 污染正式菜单。

### patch plan

生成：

```text
openforge-patches/admin-route.patch.md
openforge-patches/admin-access.patch.md
```

### 测试

```bash
NX_DAEMON=false pnpm nx test openforge
pnpm typecheck
pnpm lint
```

如果生成到 temp repo 并可运行 admin build，则执行：

```bash
pnpm build:admin
pnpm test:admin
```

### 完成标准

- Admin templates 有 golden snapshots。
- operation permission 映射正确。
- route/access 只输出 patch plan。
- 不污染正式菜单。

---

## 14. Stage I：SDK / Test / Docs Generator Pack

### 目标

补齐 SDK、测试和文档生成，让生成器真正支撑长期模块开发。

### SDK 生成物

```text
packages/sdk/src/generated/<resource>-client.ts
packages/sdk/src/generated/<resource>-types.ts
packages/sdk/src/generated/<resource>-client.spec.ts
packages/sdk/src/generated/index.ts
```

规则：

- 不覆盖手写 SDK。
- generated SDK 放 `src/generated`。
- hand-written SDK 与 generated SDK 分层。
- 生成 patch plan，提示是否需要从主 `packages/sdk/src/index.ts` re-export。
- 不绕过 OpenAPI contract。

### Test 生成物

```text
apps/api/src/modules/generated/.../*.spec.ts
apps/admin/src/pages/Generated/.../*.smoke.spec.ts
tools/generator/e2e/generated-module.e2e.spec.ts
```

必须覆盖：

- permission guard expectation
- DTO shape
- repository placeholder
- Admin smoke route
- export action placeholder
- SDK request wrapper

### Docs 生成物

```text
docs/generated/openforge/<moduleCode>.md
docs/generated/openforge/<moduleCode>-runbook.md
docs/generated/openforge/<moduleCode>-patch-review.md
```

### 测试

```bash
NX_DAEMON=false pnpm nx test openforge
NX_DAEMON=false pnpm nx test sdk
pnpm typecheck
pnpm lint
pnpm format:check
```

### 完成标准

- SDK/Test/Docs generator pack 完整。
- generated SDK 不覆盖手写 SDK。
- 文档生成可追踪 schema hash 和 template version。

---

## 15. Stage J：CLI UX、Doctor 与 E2E

### 目标

把 OpenForge CLI 做成可长期使用的开发工具，而不是内部脚本。

### CLI 完整命令

```bash
pnpm openforge:plan
pnpm openforge:diff
pnpm openforge:check
pnpm openforge:apply
pnpm openforge:rollback
pnpm openforge:manifest
pnpm openforge:doctor
```

### doctor 检查

`openforge:doctor` 必须检查：

```text
workspace root
pnpm workspace
Nx project
contracts export
module registry validation
OpenAPI snapshot exists
OpenAPI drift command exists
example schemas valid
template packs valid
protected paths config valid
manifest directory status
```

### E2E

新增 temp repo e2e：

```text
1. create temp workspace
2. run plan
3. run diff
4. run apply --yes
5. verify files
6. run apply again
7. verify idempotency
8. modify generated file manually
9. verify update blocked or conflict
10. run rollback --yes
11. verify cleanup
```

### 测试

```bash
NX_DAEMON=false pnpm nx test openforge
NX_DAEMON=false pnpm nx build openforge
pnpm openforge:doctor
pnpm openforge:plan -- --schema tools/generator/examples/core.dict.v1.schema.json --format json
pnpm openforge:diff -- --schema tools/generator/examples/core.dict.v1.schema.json --format json
pnpm openforge:apply -- --schema tools/generator/examples/core.dict.v1.schema.json --dry-run
pnpm typecheck
pnpm lint
pnpm format:check
```

### 完成标准

- CLI help 完整。
- Unknown command 失败清晰。
- doctor 能检查 workspace。
- e2e 通过。
- dry-run 不写文件。
- apply/rollback 在 temp repo 通过。

---

## 16. Stage K：CI Gate 与全仓门禁

### 目标

把 OpenForge V1 纳入全仓质量门禁。

### 新增脚本

建议 root scripts：

```json
"openforge:doctor": "...",
"openforge:apply": "...",
"openforge:rollback": "...",
"openforge:manifest": "...",
"openforge:test": "NX_DAEMON=false pnpm nx test openforge",
"openforge:gate": "pnpm openforge:doctor && pnpm openforge:check && pnpm openforge:diff -- --schema tools/generator/examples/core.dict.v1.schema.json --format json"
```

### CI gate 规则

即使没有 GitHub Actions，也要在 docs 记录本地 gate：

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm prisma:validate
pnpm openapi:export
pnpm openapi:check
pnpm openforge:doctor
pnpm openforge:check
pnpm openforge:gate
NX_DAEMON=false pnpm nx test contracts
NX_DAEMON=false pnpm nx test module-registry
NX_DAEMON=false pnpm nx test openforge
NX_DAEMON=false pnpm nx build openforge
```

### 完成标准

- OpenForge gate 可本地执行。
- docs 明确 CI 集成方式。
- progress 记录门禁结果。

---

## 17. Stage L：最终文档、Roadmap 与交接

### 目标

完成 OpenForge V1 全部交接。

### 必须更新

```text
README.md
docs/README.md
docs/handoff/README.md
docs/development/openforge-roadmap.md
docs/development/generator-roadmap.md
docs/development/openforge-v1-architecture.md
docs/development/openforge-template-authoring.md
docs/development/openforge-schema-authoring.md
docs/development/openforge-apply-rollback-runbook.md
docs/modules/module-registry.md
docs/modules/priority-roadmap.md
docs/strategy/README.md
docs/strategy/staged-roadmap.md
docs/strategy/progress.md
tools/generator/README.md
```

### 文档必须说明

- OpenForge V1 已完成什么。
- 哪些文件可以自动写。
- 哪些文件只能 patch plan。
- 如何创建 schema。
- 如何运行 plan/diff/check/apply/rollback/doctor。
- 如何审查 generated marker。
- 如何审查 manifest。
- 如何回滚。
- 如何为 S10 collaboration 使用 OpenForge。
- 为什么仍不实现 P4/P5。
- 为什么 Prisma schema 仍不自动写。

### 最终验收

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm prisma:validate
pnpm openapi:export
pnpm openapi:check
pnpm openforge:doctor
pnpm openforge:check
pnpm openforge:gate
NX_DAEMON=false pnpm nx test contracts
NX_DAEMON=false pnpm nx test module-registry
NX_DAEMON=false pnpm nx test openforge
NX_DAEMON=false pnpm nx build openforge
NX_DAEMON=false pnpm nx test sdk
pnpm test:api
pnpm test:admin
```

### 完成标准

- OpenForge V1 全部 Stage A-L complete。
- progress 有完整记录。
- docs/handoff/README.md 指向本 handoff。
- priority roadmap 标明 OpenForge V1 complete。
- 下一阶段可以进入 S10 collaboration，并要求先用 OpenForge 生成 plan/diff/apply 到 temp 或 generated-owned 路径。

---

## 18. Scope Guard

每次 progress 更新都必须包含：

```text
No human-authored file overwritten.
No .env or secret read/printed/committed.
No prisma/schema.prisma generated or modified by OpenForge.
No prisma/migrations generated by OpenForge.
No P4/P5 module implemented.
No CRM/ERP/MES/WMS/mall/payment/member/multitenancy implemented.
No Knowledge/RAG/Agent/AI workflow implemented.
No RuoYi/Yudao Java/Vue code copied.
No NestWeb/Antdpro6 business code migrated.
```

---

## 19. 推荐提交节奏

这个 handoff 不应该一个 commit 草草完成。建议按 Stage 分 commit：

```text
docs(openforge): define V1 full implementation architecture
feat(openforge-contracts): add apply manifest rollback protocols
feat(openforge-schema): harden schema and generator config DSL
feat(openforge-templates): add default template pack and virtual file system
feat(openforge-apply): add safe apply writer and manifest
feat(openforge-rollback): add manifest rollback engine
feat(openforge-api): add API skeleton generator pack
feat(openforge-admin): add Admin skeleton generator pack
feat(openforge-sdk): add SDK test docs generator pack
feat(openforge-cli): add doctor manifest apply rollback UX and e2e
chore(openforge): add full gate and final docs
```

---

## 20. 最终 Commit Summary 模板

```text
feat(openforge): complete V1 safe generator pipeline

中文：完成 OpenForge V1 全量安全生成器闭环，包含 contracts、schema/config DSL、模板包、VFS、safe apply、manifest、rollback、API/Admin/SDK/Test/Docs 生成包、doctor/gate、E2E 和文档。生成器默认 dry-run，真实写入必须显式确认，只能创建新文件或更新带 OpenForge marker 的文件，不覆盖人工文件，不写 Prisma schema/migration，不实现 P4/P5 模块。
English: Complete the OpenForge V1 safe generator pipeline with contracts, schema/config DSL, template packs, VFS, safe apply, manifests, rollback, API/Admin/SDK/Test/Docs generator packs, doctor/gate, E2E, and documentation. The generator remains dry-run by default, requires explicit confirmation for writes, only creates new files or updates files with an OpenForge marker, never overwrites human-authored files, never writes Prisma schema/migrations, and does not implement P4/P5 modules.

Tests:
- pnpm format:check
- pnpm lint
- pnpm typecheck
- pnpm test
- pnpm build
- pnpm prisma:validate
- pnpm openapi:export
- pnpm openapi:check
- pnpm openforge:doctor
- pnpm openforge:check
- pnpm openforge:gate
- NX_DAEMON=false pnpm nx test contracts
- NX_DAEMON=false pnpm nx test module-registry
- NX_DAEMON=false pnpm nx test openforge
- NX_DAEMON=false pnpm nx build openforge
- NX_DAEMON=false pnpm nx test sdk
- pnpm test:api
- pnpm test:admin
```
