# OpenForge 代码生成器路线图

OpenForge 是 OpenCore 的代码生成器。

## 目标

OpenForge 后续用于生成：

- NestJS 模块骨架。
- DTO、Controller、Service 和测试骨架。
- OpenAPI 契约片段。
- Umi Max + Ant Design Pro V6 页面骨架。
- ProComponents 列表、表单、详情和操作区。
- 权限点、菜单和模块注册表元数据。
- SDK 类型和调用封装。

## 设计原则

- 生成器不替代架构判断。
- 生成物必须可读、可格式化、可覆盖。
- 输入应优先来自模块注册表、契约和明确 schema。
- 生成器必须支持 dry run、diff 和幂等执行。

## 学习方向

可以学习 RuoYi/Yudao 的代码生成器思路，包括权限粒度、菜单联动、精简版/完整版和模块地图联动。

OpenCore 不复制 RuoYi/Yudao 的 Java/Vue 代码，也不沿用其运行时实现。

## S9 MVP 状态

S9 已完成 `tools/generator` CLI workspace tool、`packages/generator-core`
package 和 OpenForge contracts，支持：

- `pnpm openforge:plan -- --schema tools/generator/examples/core.dict.schema.json --format json`
- `pnpm openforge:diff -- --schema tools/generator/examples/core.dict.schema.json --format json`
- `pnpm openforge:check`

当前能力只输出 generate plan、readonly diff plan 和 safety/preflight report；不写生成目标文件，不覆盖人工文件，不写 Prisma schema，不创建 migration。

## OpenForge V1 状态

OpenForge V1 Stage A-L 已完成，新增：

- Schema/config DSL V1。
- Default template pack and virtual file system。
- Safe apply writer：默认 dry-run，write mode 必须 `--yes`。
- Manifest and rollback engine。
- API/Admin/SDK/Test/Docs generator pack。
- Prisma model draft and migration hint only。
- Patch-only plans for app module、Admin route/access、module registry 和 SDK index。
- `openforge:status`、`openforge:doctor`、temp repo e2e、`openforge:test` 和 `openforge:gate`。
- Schema authoring、template authoring、apply/rollback runbook 和 CI gate docs。

V1 自动写入边界：

- 可自动创建/更新：`apps/api/src/modules/generated/**`、`apps/admin/src/pages/Generated/**`、`packages/sdk/src/generated/**`、`docs/generated/openforge/**`、`prisma/openforge-drafts/**`、`openforge-patches/**`。
- 只能 patch plan：`apps/api/src/app/app.module.ts`、`apps/admin/.umirc.ts`、`apps/admin/src/access.ts`、`packages/module-registry/src/modules.ts`、`packages/sdk/src/index.ts`。
- 永远禁止：`.env*`、`prisma/schema.prisma`、`prisma/migrations/**`。

V1 不生成业务逻辑，不替代 repository/persistence 审计，不实现 P4/P5 模块。S10 collaboration 可复用 OpenForge 生成 message、todo、Approval Lite 等 approved skeleton，但必须先登记 module registry、权限和 OpenAPI tag，并人工 review patch plans。

P23 后的边界：`tools/generator` 只拥有 CLI command parsing、help/status 和
root `pnpm openforge:*` entrypoints；schema/config、template rendering、VFS、
diff、apply、rollback、doctor 和 e2e core coverage 由 `@opencore/generator-core`
拥有。
