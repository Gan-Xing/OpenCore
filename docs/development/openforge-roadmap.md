# OpenForge 路线图

OpenForge 是 OpenCore 的代码生成器。当前 S3-S9 已完成，S9 MVP 已通过单独 handoff/goal 落地只读规划能力。OpenForge V1 Full Implementation 已完成 Stage A-F，目标是从只读 plan/diff/check 升级为安全、可审计、可回滚的生成器闭环。

## 当前定位

S9 OpenForge MVP 只做只读和 dry-run，不做写文件生成器。`tool.openforge` 已进入 module registry，`tools/generator` 已成为 pnpm/Nx workspace tool，当前能力停留在 generate plan、diff plan、safety/preflight report。

V1 的目标不是推翻 S9 安全边界，而是在保持默认 dry-run 的前提下增加 contracts、schema/config DSL、template pack、virtual file system、safe apply、manifest、rollback、doctor、gate 和 API/Admin/SDK/Test/Docs skeleton generator pack。真实写入必须显式 `--yes`，且只能创建新文件或更新带合法 OpenForge generated marker 的文件。

## OpenForge V1 Full Implementation

V1 分层架构见 [OpenForge V1 Architecture](openforge-v1-architecture.md)。

V1 交付顺序：

1. Stage A：架构审计与 V1 architecture 文档。
2. Stage B：contracts V1 升级，覆盖 template、apply、manifest、rollback、marker、patch plan 和 config。
3. Stage C：schema/config DSL V1。
4. Stage D：template pack 与 virtual file system。
5. Stage E：safe apply writer 与 manifest 写入。
6. Stage F：rollback engine。
7. Stage G：API generator pack。
8. Stage H：Admin generator pack。
9. Stage I：SDK/Test/Docs generator pack。
10. Stage J：CLI UX、doctor 与 temp repo e2e。
11. Stage K：OpenForge gate。
12. Stage L：最终文档、roadmap 和交接。

V1 当前 Stage A-F 已完成 architecture、contracts、schema/config DSL、template pack/VFS、safe apply、manifest、rollback 和 manifest inspection。Stage G 的 API generator pack hardening 是最早未完成阶段。

## 第一版目标

OpenForge v1 面向 API/Admin 主线，优先生成工程骨架和同步资产。

目标生成物：

- NestJS module/controller/service/dto 骨架。
- Prisma model 草案或 migration 提示。
- 权限码清单。
- 菜单 seed 草案。
- Ant Design ProTable 页面骨架。
- ModalForm / DrawerForm 表单骨架。
- ProDescriptions 详情抽屉骨架。
- TableExportButton 操作骨架。
- OpenAPI regenerate 提示。
- E2E skeleton。
- 文档片段。

S9 当前不生成上述代码，只建立只读/dry-run/diff plan 和 safety/preflight report。

## 输入来源

OpenForge 不应从零猜业务。

第一版输入优先级：

1. 模块注册表：模块 code、layer、priority、stage、permissions、menus、openapiTags。
2. OpenAPI 契约：接口、DTO、错误、分页和 tag。
3. 人工 schema：字段、表单、列表、详情、导入导出和权限动作。
4. 生成器配置：输出路径、覆盖策略、模板版本。

## S9 MVP 边界

允许：

- 读取 module registry。
- 读取 OpenAPI snapshot。
- 读取人工 schema 示例。
- 输出 generate plan。
- 输出 diff plan。
- 校验权限码、菜单、OpenAPI tag 是否一致。

禁止：

- 不写文件。
- 不生成业务逻辑。
- 不写 Prisma schema。
- 不覆盖人工文件。
- 不生成 P4/P5 模块。

## V1 写入边界

允许：

- 创建 OpenForge generated-owned files。
- 更新带合法 generated marker 的文件。
- 生成 manifest。
- 基于 manifest 执行 rollback。
- 为人工入口文件生成 patch plan。
- 生成 Prisma model draft 或 migration hint。

禁止：

- 覆盖没有 generated marker 的人工文件。
- 写 `.env*`。
- 写 `prisma/schema.prisma`。
- 创建 `prisma/migrations/**`。
- 直接修改 `apps/api/src/app/app.module.ts`、`apps/admin/.umirc.ts`、`apps/admin/src/access.ts` 或 `packages/module-registry/src/modules.ts`。
- 实现 P4/P5 或 AI 业务模块。

## 生成器能力要求

- `dry-run`：只展示将要生成或修改的文件。
- `diff`：展示生成结果与现有文件差异。
- `idempotent`：相同输入重复执行不产生无意义 diff。
- `templateVersion`：模板版本可追踪。
- `safe overwrite`：默认不覆盖人工修改。
- `audit log`：记录生成时间、输入和输出。
- `rollback hint`：给出回滚文件清单。

## 与 RuoYi/Yudao 的关系

OpenCore 可以学习 RuoYi/Yudao 的模块地图、权限粒度、代码生成器和精简版/完整版思路。

OpenCore 不复制其 Java/Vue 代码，也不采用 Java/Vue 技术栈。OpenForge 的生成目标是 TypeScript、NestJS、Umi Max、Ant Design Pro V6、ProComponents v3、antd 6 和 React 19。
