# 契约与权限规范

本文档定义 OpenCore 后续在权限码、菜单和 OpenAPI SDK 之间保持同步的标准。当前 D1-D6 阶段只做规范设计，不实现登录、RBAC、数据库、Prisma schema 或业务接口。

## 单一事实来源

| 资产 | 单一事实来源 | 消费方 |
| --- | --- | --- |
| API 契约 | `apps/api` 导出的 OpenAPI 文档 | `packages/contracts`、`packages/sdk`、`apps/admin` |
| 权限码 | `packages/module-registry` 与后端权限声明的合并产物 | `apps/api`、`apps/admin`、OpenForge |
| 菜单 | `packages/module-registry` 的菜单元数据 | `apps/admin` |
| SDK | OpenAPI 生成流程 | `apps/admin`、未来 `apps/web/mobile/miniapp/desktop` |

后续实现时，禁止前端手写与 OpenAPI 不一致的接口类型。

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
monitor:job:retry
tool:generator:run
```

规则：

- `Permission.code` 是权限身份，必须稳定、可审计、可跨端共享。
- `Role.code` 是系统身份，必须稳定、可迁移、可脚本化。
- 权限码只表达能力，不表达菜单层级。
- 删除权限码必须经过迁移说明，不能静默删除。
- 权限码变更必须同步模块注册表、后端守卫声明、前端 access 规则和文档。

D1-D6 只定义标准，不实现 RBAC。

## 菜单标准

菜单用于描述后台导航和页面入口，不等同于权限本身。

建议字段：

- `key`：稳定菜单标识，例如 `core.user.list`。
- `path`：后台路由路径，例如 `/system/users`。
- `titleKey`：国际化 key。
- `icon`：图标名。
- `permission`：进入菜单所需权限码。
- `moduleId`：所属模块。
- `order`：排序值。
- `parentKey`：父级菜单。
- `visible`：是否默认可见。

对应规则：

- `key` 必须稳定，不随展示文案变化。
- `path` 由 `apps/admin` 路由体系消费。
- `permission` 引用 `Permission.code`。
- 一个菜单可以对应一个主权限码，页面内按钮和操作使用更细粒度权限码。
- 菜单声明在模块注册表中，渲染在 `apps/admin` 中完成。

## OpenAPI SDK 同步流程

后续流程应固定为：

1. `apps/api` 通过 NestJS OpenAPI 能力导出 OpenAPI 文档。
2. CI 校验 OpenAPI 文档格式和破坏性变更。
3. `packages/contracts` 保存规范化后的契约和共享类型。
4. `packages/sdk` 基于 OpenAPI 生成客户端类型和请求封装。
5. `apps/admin` 只通过 SDK 或 SDK 约束的 request 层访问 API。
6. OpenForge 根据 OpenAPI、模块注册表和权限码生成页面/表单/菜单草案。

## 防止 OpenAPI drift

OpenAPI drift 指后端真实接口、契约文件、SDK 和前端调用之间发生偏移。

后续 CI 应至少包含：

- 导出最新 OpenAPI 文档。
- 与仓库内契约产物比对。
- 发现未提交契约变更时失败。
- 重新生成 SDK。
- 检查 SDK 生成结果是否有未提交 diff。
- 对破坏性变更输出报告。

## 变更规则

- 后端接口新增字段：先更新 OpenAPI，再生成 SDK，再更新前端消费。
- 后端接口删除字段：必须标记 breaking change，并给出迁移说明。
- 权限码新增：同步模块注册表和后端声明。
- 权限码删除：必须提供替代或废弃记录。
- 菜单新增：必须绑定 `moduleId` 和 `permission`。

## 当前阶段禁止项

本文档不代表已经实现登录、RBAC、菜单渲染、SDK 生成或 OpenAPI CI。D1-D6 只锁定标准，为 S2 初始化 `apps/api` 和 `apps/admin` 做准备。
