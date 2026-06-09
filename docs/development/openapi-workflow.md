# OpenAPI 工作流

OpenCore 使用 OpenAPI 作为 API 契约、SDK 和多端接入的核心桥梁。

## 目标

- API 契约从后端源头生成。
- 前端和多端客户端通过契约生成 SDK 或类型。
- 错误码、分页、排序、过滤、鉴权头和上传下载能力形成统一规范。
- OpenForge 可以基于契约生成后台页面、表单、列表、权限点和测试骨架。

## 后续方向

S2 可以建立 OpenAPI 空跑流程：

- 从 NestJS 应用导出 OpenAPI 文档。
- 将 OpenAPI 文档作为 `packages/contracts` 的输入。
- 生成 `packages/sdk` 的客户端类型和调用封装。
- 在 CI 中校验契约变更。

## S0/S1 边界

当前阶段不初始化 NestJS 项目，不提供真实接口，不实现登录、RBAC、业务模块或数据库连接。

本文档只定义工作流方向，不写业务代码。
