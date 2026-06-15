# 模块注册表

模块注册表是 OpenCore 的模块元数据中心，由 `packages/module-registry` 承载。

## 当前状态

S3 已实现 `@opencore/module-registry`，并在 S5-S9、Q001、BE20、Admin Pro V6 和 Cycle-021 中被 Admin shell、RBAC、系统管理、Monitor/Tool/Collaboration/Optional/Integration 页面、OpenAPI gate、OpenForge 和 Admin live-only guards 持续消费。OpenForge V1 已完成安全生成器闭环，但仍依赖 registry 作为 module、permission、menu 和 OpenAPI tag 的单一事实来源。

当前能力：

- 登记 core、monitor、tool、collaboration、optional 和 integration 模块草案及实际页面入口。
- 管理权限码、菜单、OpenAPI tag、stage、priority、enabledByDefault。
- 校验重复 module code、permission code、menu key。
- 校验菜单 permission 指向已注册权限码。
- 阻止高风险 P5/行业/真实支付/AI 模块绕过准入泄漏进 registry。
- 为 OpenForge V1 schema validation、patch plan、Admin routes/access drift guard 和后续明确准入的模块提供 module metadata。

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

## 当前已覆盖模块

| 层级          | 模块                                                                                                  |
| ------------- | ----------------------------------------------------------------------------------------------------- |
| core          | dashboard、user、role、permission、menu、dict、config、notice、dept、post、file、audit-log、login-log |
| monitor       | status、version、queue、job、cache、online-user                                                       |
| tool          | openapi、export、openforge                                                                            |
| collaboration | message、notice、todo、approval-lite                                                                  |
| optional      | report、export-job                                                                                    |
| integration   | provider、mail、sms、oauth、wechat、websocket、billing-design                                         |

## 长期 backlog

P4/P5 模块继续保留在长期 backlog，不进入当前 core：

- optional：tenant、workflow、full report designer、full export executor 等。
- integration：mail、sms、wechat、oauth、pay 等。
- industry：member、mall、crm、erp、mes、wms、iot、im 等。
- ai：knowledge、RAG、Agent、AI workflow 等。

## 与权限、菜单和 OpenAPI 的关系

- 模块拥有权限码，格式为 `<module>:<resource>:<action>`。
- 菜单由模块注册表声明，由 `apps/admin` 渲染。
- OpenAPI tag 由模块注册表声明，由 `apps/api` 实现。
- OpenForge V1 读取模块注册表、OpenAPI 和人工 schema，生成 plan/diff/check、generated skeleton、patch plan、manifest 和 rollback 信息。
- `tool:openforge:manage` 只代表允许运行 OpenForge tool。真实写入仍必须显式 `--yes`，且只能写 generated-owned files 或 patch-plan markdown。
- Registry 本身是 human-authored source of truth。OpenForge 不直接修改 `packages/module-registry/src/modules.ts`；只生成 `openforge-patches/module-registry.patch.md` 供人工 review。
- 后续任何明确准入的模块使用 OpenForge 前，必须先登记 module、permission code、menu 和 OpenAPI tag；不得用 OpenForge 绕过 registry 直接生成未登记模块。
