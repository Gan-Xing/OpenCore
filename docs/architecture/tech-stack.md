# 技术栈

OpenCore（开元）定位为 **AI Native 企业级全栈 Monorepo**。技术栈固定如下。

## Monorepo

- pnpm workspace。
- Nx。
- TypeScript。
- Jest。
- Prettier / ESLint。

当前已落地 `apps/api`、`apps/admin`、`packages/shared`、`packages/contracts`、`packages/module-registry`、`packages/sdk`。

## 后端

- NestJS。
- Prisma。
- PostgreSQL。
- OpenAPI / Swagger。
- Redis：后续缓存、限流、队列依赖。
- BullMQ：后续后台任务。
- MinIO/S3：后续对象存储 provider。

当前已完成：

- API foundation：env/config validation、request id、统一错误、结构化日志、安全基线。
- RBAC：User、Role、Permission、Menu、`Role.code`、`Permission.code`、permission guard。
- System management：dict、system config、file asset、audit log、login log。
- Monitor/tool：status、version、queue 只读诊断、OpenAPI drift check、table export protocol。

## 官方后台

官方后台主线固定为：

- Umi Max。
- Ant Design Pro V6。
- ProComponents v3。
- antd 6。
- React 19。

当前已完成：

- Dashboard shell。
- 403/404/500。
- request/access 规范。
- registry 菜单消费。
- RBAC 页面。
- 系统管理页面。
- Monitor/Tool 页面。

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

当前仍只保留 `web/mobile/miniapp/desktop` 占位目录和 `.gitkeep`。

## AI Native

AI Native 当前只做架构预留，不实现 RAG、Agent、知识库、模型调用或 AI 业务。

AI 能力必须建立在权限、审计、数据边界、成本治理和 S8 可观测能力稳定之后。
