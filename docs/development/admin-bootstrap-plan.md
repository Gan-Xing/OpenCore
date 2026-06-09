# apps/admin 启动计划

本文档定义 `apps/admin` 的 Umi Max + Ant Design Pro V6 启动顺序。当前 D1-D6 阶段只做计划，不初始化前端项目，不实现登录、RBAC、菜单渲染或业务页面。

## 官方主线

`apps/admin` 固定使用：

- Umi Max。
- Ant Design Pro V6。
- ProComponents v3。
- antd 6。
- React 19。

明确不做：

- 不迁移到 Refine。
- 不使用 Vue。
- 官方 admin 不使用 MUI。
- 不实现业务登录或 RBAC。

## 启动顺序

### ADMIN-0：初始化官方模板

- 使用官方 Ant Design Pro V6 / Umi Max 路线初始化 `apps/admin`。
- 锁定 React 19、antd 6、ProComponents v3、Umi Max。
- 接入 Nx target：`serve`、`build`、`lint`、`test`、`typecheck`。

验收：

- 空后台可启动、可构建。
- 没有业务页面。

### ADMIN-1：模板页归档

- 将官方模板页保留为 `examples/templates` 或等价位置。
- 业务路由从干净结构开始。
- 模板页只作为设计和组件参考，不作为业务模块。

验收：

- 示例页和正式路由边界清晰。

### ADMIN-2：request 规范

- 建立统一 request 层。
- request 只消费 `packages/sdk` 或 SDK 约束的客户端。
- 错误处理、鉴权头、trace id、文件上传下载必须走统一入口。

验收：

- 禁止页面直接手写裸 API 地址。

### ADMIN-3：access 规范

- 建立 access 层的消费规则。
- access 只消费权限码，不直接写死角色名。
- 权限码来自 `packages/module-registry` 或后端契约产物。

验收：

- 页面和按钮权限使用 `Permission.code`。
- D1-D6 不实现 RBAC 数据流。

### ADMIN-4：路由和菜单规范

- 路由 path 与菜单 path 对齐。
- 菜单 key 使用稳定 key，不使用展示文案。
- 菜单 permission 引用权限码。
- 菜单来源应能由模块注册表生成或校验。

验收：

- 页面路由、菜单、权限码可以互相追踪。

### ADMIN-5：OpenAPI client 规范

- 通过 OpenAPI 生成 SDK。
- `apps/admin` 只依赖 SDK 暴露的类型和请求方法。
- SDK 变更必须由 OpenAPI 变更驱动。

验收：

- 前端类型不与后端契约漂移。

### ADMIN-6：测试和 E2E 基线

- 建立页面级 smoke test。
- 建立构建、类型检查和基础 E2E。
- E2E 初始只覆盖空壳、导航和健康页面，不覆盖业务。

验收：

- S2 可以证明后台壳层可运行。

## 为什么不启动其他 UI 方案

官方后台要先锁定 Umi Max + Ant Design Pro V6 主线，避免平台还未成型时分裂成多套后台技术栈。

MUI、Refine 或其他 UI 方案未来可以作为额外 app 评估，例如 `apps/admin-mui`，但不进入官方 admin 主线。

## 风险

- 过早接入业务登录会导致 access 规范被实现细节绑死。
- 过早创建业务页面会让菜单、权限码和 OpenAPI 同步规范失效。
- 保留模板页但不隔离，会污染后续正式后台结构。
