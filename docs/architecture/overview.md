# OpenCore 架构总览

OpenCore 的中文名是“开元”，品牌语是“开放之源，万物之始”。项目定位是 **AI Native 企业级全栈 Monorepo**。

OpenCore 面向一人公司、小团队和现代企业应用开发，目标是在一个 monorepo 内统一管理 API、官方后台、官网、移动端、小程序、桌面端、共享契约、模块注册表、代码生成器 OpenForge 和 AI Native 能力预留。

## S0/S1 范围

当前阶段只创建骨架和文档：

- 建立 pnpm workspace + Nx 的 monorepo 基础。
- 预留 `apps/api` 和 `apps/admin`。
- 仅占位 `apps/web`、`apps/mobile`、`apps/miniapp`、`apps/desktop`。
- 预留共享包、契约包、SDK、认证包、配置包、模块注册表、Web UI、设计令牌、国际化、测试包和 AI Core。
- 预留基础基础设施目录和文档目录。

## 暂不实现

S0/S1 不写业务代码，不实现登录、RBAC、多租户、CRM、ERP、MES、WMS、商城、支付、会员、工作流、知识库、RAG、Agent 或模型调用。

S0/S1 不连接数据库，不生成 Prisma schema，不初始化 Next.js、Expo、Taro 或 Tauri 项目。

## 官方主线

后端官方主线是 NestJS + Prisma + PostgreSQL + Redis + BullMQ + MinIO/S3 + OpenAPI。

前端官方后台主线是 Umi Max + Ant Design Pro V6 + ProComponents v3 + antd 6 + React 19。

OpenCore 不迁移到 Refine，不使用 Vue，不使用 Java，官方 admin 不使用 MUI。其他 UI 方案可以在未来作为额外 app 存在，例如 `apps/admin-mui`。
