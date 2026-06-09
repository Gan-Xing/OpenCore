# 技术栈

OpenCore（开元）定位为 **AI Native 企业级全栈 Monorepo**。技术栈固定如下。

## Monorepo

- pnpm workspace。
- Nx。
- TypeScript。

## 后端

- NestJS。
- Prisma。
- PostgreSQL。
- Redis。
- BullMQ。
- MinIO/S3。
- OpenAPI。

当前 S0/S1 不初始化 NestJS 项目，不连接数据库，不生成 Prisma schema。

## 官方后台

官方后台主线固定为：

- Umi Max。
- Ant Design Pro V6。
- ProComponents v3。
- antd 6。
- React 19。

明确边界：

- 不迁移到 Refine。
- 不使用 Vue。
- 官方 admin 不使用 MUI。
- 其他 UI 方案未来可以作为额外 app，例如 `apps/admin-mui`。

## 其他端

- 官网：Next.js，后续阶段。
- 移动端：Expo React Native，后续阶段。
- 小程序：Taro + React，后续阶段，不直接使用 React Native。
- 桌面端：Tauri，后续阶段。

S0/S1 只创建 `web/mobile/miniapp/desktop` 占位目录和 `.gitkeep`。

## AI Native

第一阶段只做架构预留，不实现 RAG、Agent、知识库、模型调用或 AI 业务。

`packages/ai-core` 仅作为未来能力边界预留。
