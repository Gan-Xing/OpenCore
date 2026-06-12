# 契约与权限规范

本文档定义 OpenCore 在权限码、菜单、OpenAPI、SDK 和 Admin access 之间保持同步的标准。当前 S3-S9、Q001 和 BE20 已完成，本文档既是规范，也是后续 S10+、cycle-021 或专项模块准入的约束。

## 单一事实来源

| 资产     | 单一事实来源                                                                    | 消费方                                               |
| -------- | ------------------------------------------------------------------------------- | ---------------------------------------------------- |
| API 契约 | `apps/api` 导出的 OpenAPI 文档与 `packages/contracts/openapi/opencore-api.json` | `packages/contracts`、`packages/sdk`、`apps/admin`   |
| 权限码   | `packages/module-registry` 与后端权限声明的合并产物                             | `apps/api`、`apps/admin`、OpenForge                  |
| 菜单     | `packages/module-registry` 的菜单元数据                                         | `apps/admin`                                         |
| SDK      | OpenAPI 生成流程 + `packages/sdk` typed client                                  | `apps/admin`、未来 `apps/web/mobile/miniapp/desktop` |

禁止前端手写与 OpenAPI 不一致的接口类型。

## 权限码标准

权限码用于描述“是否允许执行某个动作”，不是 UI 文案。

推荐格式：

```text
<module>:<resource>:<action>
```

示例：

```text
core:user:read
core:user:create
monitor:queue:read
tool:openapi:read
tool:export:run
```

规则：

- `Permission.code` 是权限身份，必须稳定、可审计、可跨端共享。
- `Role.code` 是系统身份，必须稳定、可迁移、可脚本化。
- 权限码只表达能力，不表达菜单层级。
- 删除权限码必须经过迁移说明，不能静默删除。
- 权限码变更必须同步模块注册表、后端守卫声明、前端 access 规则、SDK 和文档。

## 菜单标准

菜单用于描述后台导航和页面入口，不等同于权限本身。

字段方向：

- `key`：稳定菜单标识，例如 `system.users`。
- `path`：后台路由路径，例如 `/system/users`。
- `title` 或 `titleKey`：展示文案或国际化 key。
- `permissionCode`：进入菜单所需权限码。
- `moduleId` / `module code`：所属模块。
- `order`：排序值。
- `stage`：阶段来源。

对应规则：

- `key` 必须稳定，不随展示文案变化。
- `path` 由 `apps/admin` 路由体系消费。
- `permissionCode` 引用 `Permission.code`。
- 页面内按钮和操作使用更细粒度权限码。
- 菜单声明在模块注册表中，渲染在 `apps/admin` 中完成。

## OpenAPI SDK 同步流程

当前流程固定为：

1. `apps/api` 通过 NestJS OpenAPI 能力导出 OpenAPI 文档。
2. `pnpm openapi:export` 更新 `packages/contracts/openapi/opencore-api.json`。
3. `pnpm openapi:check` 检查 OpenAPI drift。
4. `packages/sdk` 基于契约和 registry 提供 typed client。
5. `apps/admin` 只通过 SDK 或 SDK 约束的 request 层访问 API。
6. OpenForge S9 根据 OpenAPI、模块注册表和权限码生成 dry-run/diff plan。

## 防止 OpenAPI drift

OpenAPI drift 指后端真实接口、契约文件、SDK 和前端调用之间发生偏移。

CI 至少应包含：

- 导出最新 OpenAPI 文档。
- 与仓库内契约产物比对。
- 发现未提交契约变更时失败。
- 检查 SDK 生成结果是否有未提交 diff。
- 对破坏性变更输出报告。

## 变更规则

- 后端接口新增字段：先更新 OpenAPI，再更新 SDK，再更新前端消费。
- 后端接口删除字段：必须标记 breaking change，并给出迁移说明。
- 权限码新增：同步模块注册表和后端声明。
- 权限码删除：必须提供替代或废弃记录。
- 菜单新增：必须绑定 module code 和 permission code。
- P4/P5 模块新增：必须先通过模块准入文档，不得直接进入 core。
