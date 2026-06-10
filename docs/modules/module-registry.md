# 模块注册表

模块注册表是 OpenCore 的模块元数据中心，由 `packages/module-registry` 承载。

## 当前状态

S3 已实现 `@opencore/module-registry`，并在 S5-S8 中被 Admin shell、RBAC、系统管理、Monitor/Tool 页面持续消费。S9 已登记 `tool.openforge`，只允许只读 generate plan、diff plan、safety/preflight report。

当前能力：

- 登记 S5-S9 模块草案和实际页面入口。
- 管理权限码、菜单、OpenAPI tag、stage、priority、enabledByDefault。
- 校验重复 module code、permission code、menu key。
- 校验菜单 permission 指向已注册权限码。
- 阻止 S3-S8 期间 P4/P5 模块泄漏进 registry。

## 模块分层

OpenCore 模块分层采用：

- `core`：系统运行必需能力。
- `monitor`：日志、审计、健康检查、任务和运行状态。
- `tool`：OpenAPI、导入导出、OpenForge、开发工具。
- `collaboration`：团队协作、审批、消息和工作台能力。
- `optional`：可选通用业务模块。
- `industry`：行业化模块。
- `integration`：第三方集成。
- `ai`：AI Native 能力。
- `experimental`：实验能力。

## S3-S8 已覆盖模块

| 层级    | 模块                                                                              |
| ------- | --------------------------------------------------------------------------------- |
| core    | dashboard、user、role、permission、menu、dict、config、file、audit-log、login-log |
| monitor | status、version、queue                                                            |
| tool    | openapi、export、openforge                                                        |

## 长期 backlog

P4/P5 模块继续保留在长期 backlog，不进入当前 core：

- optional：tenant、workflow、report、online-user、cache、job 等。
- integration：mail、sms、wechat、oauth、pay 等。
- industry：member、mall、crm、erp、mes、wms、iot、im 等。
- ai：knowledge、RAG、Agent、AI workflow 等。

## 与权限、菜单和 OpenAPI 的关系

- 模块拥有权限码，格式为 `<module>:<resource>:<action>`。
- 菜单由模块注册表声明，由 `apps/admin` 渲染。
- OpenAPI tag 由模块注册表声明，由 `apps/api` 实现。
- OpenForge S9 读取模块注册表、OpenAPI 和人工 schema，生成只读 dry-run/diff plan；`tool:openforge:manage` 只代表允许运行 plan/diff/check，不代表写生成目标文件。
