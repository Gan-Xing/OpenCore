# 模块优先级路线图

OpenCore 采用阶段化推进，避免 S0/S1 过早写业务代码。

## S0/S1：骨架与文档

- 建立 pnpm workspace + Nx。
- 创建 apps、packages、tools、infra、docs 目录。
- 明确 OpenCore（开元）的品牌、定位和技术栈。
- 明确模块分层和 RuoYi/Yudao 学习边界。
- 预留 OpenForge、模块注册表和 AI Native 架构位置。

## S2：API/Admin 基线

建议后续 S2 只聚焦工程基线：

- 初始化 `apps/api` 为 NestJS 应用。
- 初始化 `apps/admin` 为 Umi Max + Ant Design Pro V6 应用。
- 建立 lint、format、typecheck、test 的 Nx targets。
- 建立 OpenAPI 生成链路的空跑流程。
- 设计配置加载、环境变量规范和本地开发脚本。
- 只做健康检查和工程示例，不实现业务登录或 RBAC。

## S3：契约与生成器

- 定义 OpenAPI 工作流。
- 规划 DTO、SDK、错误码、分页、排序和过滤规范。
- 设计 OpenForge 的输入、输出和插件边界。
- 设计模块注册表 schema，但仍需避免直接进入复杂业务。

## S4 以后：模块能力

在 API/Admin 基线、契约和生成器稳定后，再评估 core、monitor、tool 等基础模块实现。

CRM、ERP、MES、WMS、商城、支付、会员、多租户、工作流、知识库、RAG 和 Agent 都不属于 S0/S1，也不应在 S2 贸然展开。
