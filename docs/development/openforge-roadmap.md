# OpenForge 路线图

OpenForge 是 OpenCore 的代码生成器。D1-D6 阶段只锁定第一版目标和边界，不实现生成器代码。

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

当前阶段不生成上述代码，只定义路线。

## 输入来源

OpenForge 不应从零猜业务。

第一版输入优先级：

1. 模块注册表：模块 id、layer、edition、permissions、menus、openapiTags。
2. OpenAPI 契约：接口、DTO、错误、分页和 tag。
3. 人工 schema：字段、表单、列表、详情、导入导出和权限动作。
4. 生成器配置：输出路径、覆盖策略、模板版本。

## 输出边界

| 输出          | 目标位置                                           | 说明                                                   |
| ------------- | -------------------------------------------------- | ------------------------------------------------------ |
| NestJS 骨架   | `apps/api`                                         | 后续生成 module/controller/service/dto，不生成业务逻辑 |
| Prisma 草案   | 待定                                               | 只给草案或 migration 提示，不在 D1-D6 写 schema        |
| 权限码        | `packages/module-registry`                         | 与 `Permission.code` 标准对齐                          |
| 菜单 seed     | `packages/module-registry` 或 `apps/admin` seed 区 | 与菜单 key/path/permission 标准对齐                    |
| ProTable 页面 | `apps/admin`                                       | 只生成页面骨架和 SDK 调用位置                          |
| 表单和详情    | `apps/admin`                                       | 使用 ProComponents，不使用 MUI                         |
| SDK 提示      | `packages/sdk`                                     | 提醒重新生成，不手写漂移客户端                         |
| 文档片段      | `docs/*`                                           | 记录生成输入、权限和菜单                               |

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

## 分阶段路线

### OF-0：设计锁定

- 明确输入、输出和安全规则。
- 明确权限码、菜单和 OpenAPI 的同步关系。
- 不写生成器代码。

### OF-1：只读校验器

- 读取模块注册表。
- 校验模块 id、权限码、菜单和 OpenAPI tag。
- 输出报告，不修改文件。

### OF-2：dry-run 生成

- 根据示例输入生成文件计划。
- 只输出 diff，不落盘。

### OF-3：骨架生成

- 生成 NestJS 和 Ant Design Pro 骨架。
- 生成权限码和菜单草案。
- 支持幂等执行。

### OF-4：OpenAPI 联动

- 生成后提示重新导出 OpenAPI。
- 重新生成 SDK。
- 检查前端调用是否与 SDK 对齐。

## 当前阶段禁止项

D1-D6 不实现 OpenForge CLI，不写模板，不生成业务代码，不写 Prisma schema，不实现 CRM、ERP、MES、WMS、商城、支付、会员、多租户、RAG、Agent 或知识库。
