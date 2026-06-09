# RuoYi/Yudao 模块地图学习

OpenCore 可以学习 RuoYi 和 Yudao 的产品组织经验，但不复制它们的 Java/Vue 代码。

## 可学习内容

- 模块地图：从系统、监控、工具、基础设施、业务扩展等维度组织能力。
- 权限粒度：菜单、按钮、API、数据权限等粒度的分层设计经验。
- 代码生成器：从数据模型、表单、列表、API、权限和菜单联动生成工程资产的思路。
- 精简版/完整版：用模块开关和依赖关系控制发行形态。

## 不采用内容

- 不使用 Java。
- 不使用 Vue。
- 不复制 RuoYi/Yudao 的代码。
- 不照搬其目录结构、运行时约束或前后端实现细节。

## OpenCore 的转译方向

OpenCore 使用 TypeScript 全栈主线：

- 后端以 NestJS、Prisma、PostgreSQL、Redis、BullMQ、MinIO/S3 和 OpenAPI 为核心。
- 官方后台以 Umi Max、Ant Design Pro V6、ProComponents v3、antd 6 和 React 19 为核心。
- 代码生成器使用 OpenForge。
- 模块注册表以 OpenCore 自己的 `core / monitor / tool / collaboration / optional / industry / integration / ai / experimental` 分层为基础。

## 阶段边界

S0/S1 只沉淀模块地图和路线，不实现权限、登录、RBAC、代码生成器逻辑或业务模块。
