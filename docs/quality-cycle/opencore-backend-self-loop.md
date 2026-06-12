# OpenCore Backend Self-Loop Execution Prompt

你是 OpenCore 后端实现代理。目标是把 OpenCore 后端完整做完，不是只写计划。

## 总目标

把 OpenCore 后端实现成最佳实践 Nx/NestJS 企业级后端：

- `apps/api` 只做启动、HTTP 入口、模块聚合、OpenAPI 导出。
- 可复用能力必须下沉到 `packages/*` 或 `tools/*`。
- 参考若依 / 芋道的优秀功能闭环，但不要盲目照抄 Java 实现。
- 遇到 TS/NestJS/Prisma/Redis/BullMQ/MinIO 有更好实现方式时，优先选择 TS 生态最佳实践。
- 所有模块必须按依赖度从低到高实现。
- 没有全部完成前，不要主动结束；完成一个模块后继续下一个模块。

## 自循环规则

反复执行下面循环，直到所有后端模块全部完成：

```txt
1. 读取当前仓库结构、backlog、progress、TODO、测试结果。
2. 判断尚未完成的最低依赖模块。
3. 只选当前最低依赖模块作为本轮目标。
4. 实现该模块的数据库、服务、接口、权限、日志、缓存、OpenAPI、测试。
5. 运行相关检查和测试。
6. 修复失败。
7. 更新 backlog/progress/交接文档。
8. 提交本轮完成摘要。
9. 继续下一个最低依赖模块。
```

只有下面情况允许暂停：

```txt
1. 所有后端模块已全部完成，并且测试通过。
2. 缺少必须的外部密钥、数据库权限、CI 权限，导致无法继续。
3. 仓库存在不可自动解决的破坏性冲突。
```

暂停时必须输出：

```txt
- 已完成模块
- 未完成模块
- 当前测试结果
- 阻塞原因
- 下一步恢复指令
```

## 模块实现顺序

严格按下面顺序，不准跳到高依赖模块：

```txt
1. packages/common
2. packages/core
3. packages/database
4. packages/redis
5. packages/file
6. packages/system-dict
7. packages/system-config
8. packages/system-notice
9. packages/system-dept
10. packages/system-post
11. packages/system-menu
12. packages/system-role
13. packages/system-user
14. packages/security-auth
15. packages/security-rbac
16. packages/security-data-scope
17. packages/audit-login-log
18. packages/audit-operation-log
19. packages/online-user
20. packages/scheduler
21. packages/monitor
22. packages/generator-core
23. tools/generator
24. apps/api 聚合与总体验收
```

可以合并成更合理的包名，例如：

```txt
packages/system
packages/security
packages/audit
packages/scheduler
packages/monitor
packages/generator-core
```

但必须保持内部实现顺序。

## 对标若依，但选择 TS 最佳实践

参考若依这些好功能：

```txt
- 统一响应
- 全局异常
- 分页
- 用户、角色、菜单、部门、岗位
- 字典、参数、公告
- 登录认证
- RBAC 权限
- 数据权限
- 登录日志
- 操作日志
- 在线用户
- 文件上传
- 定时任务
- 缓存监控
- 服务监控
- 代码生成器
```

不要盲抄这些 Java 实现：

```txt
- 不照搬 Spring Security 结构，用 NestJS Guard / Interceptor / Decorator。
- 不照搬 MyBatis XML，用 Prisma / Query Builder / Repository 抽象。
- 不照搬 Quartz 反射调用，用 BullMQ / Nest Scheduler / 白名单任务注册。
- 不照搬 Java AOP，用 Nest Interceptor + Metadata Decorator。
- 不把所有业务塞进 apps/api。
```

## Monorepo 边界

```txt
apps/api
  只允许放：
  - main.ts
  - app.module.ts
  - bootstrap
  - API 聚合模块
  - OpenAPI 导出
  - 少量运行时配置

packages/common
  放：
  - 通用类型
  - 常量
  - 工具函数
  - 基础 DTO
  - 分页类型
  - 统一错误码

packages/core
  放：
  - 全局异常过滤器
  - 响应拦截器
  - 分页封装
  - OpenAPI 基础装饰器
  - 请求上下文
  - 基础 Nest 模块能力

packages/database
  放：
  - PrismaService
  - 事务封装
  - 数据库工具
  - seed 辅助

packages/redis
  放：
  - RedisService
  - 缓存封装
  - key 命名规范
  - TTL 管理

packages/security
  放：
  - auth
  - jwt
  - captcha
  - password hashing
  - permission guard
  - role guard
  - data-scope

packages/system
  放：
  - dict
  - config
  - notice
  - dept
  - post
  - menu
  - role
  - user

packages/audit
  放：
  - login log
  - operation log
  - audit decorator
  - audit interceptor

packages/file
  放：
  - local storage
  - MinIO storage
  - storage abstraction

packages/scheduler
  放：
  - dynamic jobs
  - BullMQ
  - cron validation
  - job logs
  - job registry whitelist

packages/monitor
  放：
  - health check
  - redis monitor
  - server monitor
  - queue monitor

packages/generator-core
  放：
  - 元数据解析
  - 模板渲染
  - 代码生成核心

tools/generator
  放：
  - OpenForge CLI
  - check/apply/diff/doctor/manifest/plan/rollback
```

## 每个模块的完成标准

每个模块必须满足：

```txt
1. 数据模型 / Prisma schema / migration / seed
2. Service
3. Controller 或对外 provider
4. DTO + validation
5. OpenAPI 标注
6. 权限标识
7. 日志接入
8. 缓存接入，适用时必须做
9. 单元测试
10. 集成测试或 e2e 测试
11. 边界场景测试
12. 更新 backlog/progress
13. 运行 pnpm 检查
```

不要只做 CRUD。必须做闭环。

## 必跑命令

根据实际项目脚本选择执行：

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build:api
pnpm prisma:validate
pnpm openapi:check
```

涉及 generator 时额外执行：

```bash
pnpm openforge:doctor
pnpm openforge:check
pnpm openforge:diff
pnpm openforge:test
```

失败必须修复，不能跳过。

## 每轮输出格式

每完成一轮，输出：

```txt
本轮模块：
完成内容：
涉及文件：
测试结果：
若依参考点：
TS 最佳实践取舍：
backlog/progress 更新：
下轮模块：
```

然后继续执行下一个模块。

## 禁止事项

```txt
- 禁止只输出计划不实现。
- 禁止跳过测试。
- 禁止为了通过测试删除测试。
- 禁止把可复用能力塞进 apps/api。
- 禁止盲目照抄若依 Java 实现。
- 禁止先做 user/auth，再回头补 common/core/database。
- 禁止留下 any、TODO、mock 假实现作为完成结果。
- 禁止破坏现有 openforge、admin、api 脚本。
```

## 最终验收

全部完成后，必须证明：

```txt
1. 后端模块全部完成。
2. apps/api 保持轻量。
3. packages/tools 承载可复用能力。
4. 认证、RBAC、数据权限、系统管理、日志、文件、定时任务、监控、生成器全部形成闭环。
5. OpenAPI 可导出。
6. Prisma schema 有效。
7. 单测、集成/e2e、typecheck、lint、build 通过。
8. backlog/progress 已更新。
```

最终输出：

```txt
Backend complete.
Completed modules:
Test evidence:
Remaining issues:
Commit summary EN:
Commit summary ZH:
```
