# OpenCore S3-S8 Implementation Handoff

更新时间：2026-06-10

适用模型：GPT-5.5 xhigh / Codex

本 handoff 用于把 OpenCore 从当前 S2 API/Admin 空主干，连续推进到 S8 monitor/tool 基线。它不是新的战略包，而是基于 `docs/strategy/` 的实现执行协议。

## 1. 总目标

从 S3 到 S8，完成一个可公开开发、可创办公司使用的企业后台基础架构：

```text
S3 contracts / shared / module-registry
S4 API core foundation
S5 Admin core shell
S6 auth / RBAC system
S7 system management
S8 monitor / tool baseline
```

S3-S8 只实现 P0-P3 主线。P4/P5 能力进入长期 backlog，但不得抢占当前实现范围。

## 2. 必读文件

每轮 `/goal` 开始前必须读取：

1. `docs/strategy/README.md`
2. `docs/strategy/progress.md`
3. `docs/strategy/staged-roadmap.md`
4. `docs/strategy/ruoyi-yudao-capability-matrix.md`
5. `docs/strategy/api-target-architecture.md`
6. `docs/strategy/admin-page-map.md`
7. `docs/strategy/legacy-reuse-audit.md`
8. 本文件

如果文件之间冲突，以更严格的范围边界和测试门禁为准。

## 3. 核心循环规则

每轮只允许推进 S3-S8 中最早未完成阶段。

```text
1. 读取 strategy 和本 handoff。
2. 读取 progress.md，识别最早未完成阶段。
3. 只做该阶段必要代码、文档和测试。
4. 运行该阶段要求的检查。
5. 修复失败，不扩大范围。
6. 更新 progress.md，写明完成项、剩余项、测试证据。
7. 输出双语 commit summary。
```

禁止一轮同时实现多个大阶段；禁止为了通过测试临时删除约束；禁止把 P4/P5 模块提前塞进 core。

## 4. S3 阶段：contracts / shared / module-registry

### 目标

建立 OpenCore 的契约、共享类型和模块注册表单一事实来源。

### 允许新增

- `packages/contracts`
- `packages/shared`
- `packages/module-registry`
- OpenAPI 导出脚本或占位协议
- 权限码 schema
- 菜单 schema
- registry 校验测试

### 不允许

- 不实现登录
- 不实现 RBAC
- 不接数据库
- 不写 Prisma schema
- 不创建业务 CRUD

### 必跑检查

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
```

若新增了 contracts/registry 专用脚本，也必须运行并记录结果。

### 退出条件

- contracts/shared/module-registry 可被 Nx 或 pnpm 识别。
- 权限码和菜单字段有类型或 schema 校验。
- registry 至少覆盖 S6-S8 需要的 core/monitor/tool 模块声明草案。
- Admin 和 API 后续可以消费该 registry。
- progress.md 记录 S3 完成证据。

## 5. S4 阶段：API core foundation

### 目标

把 `apps/api` 从 health/OpenAPI skeleton 扩展成稳定后端基础层。

### 允许实现

- env/config validation
- request id / trace id
- unified error response
- structured logging
- security baseline
- health/readiness 扩展
- OpenAPI export baseline

### 不允许

- 不接业务数据库模型
- 不实现 auth/RBAC
- 不写用户/角色/权限 CRUD
- 不做多租户

### 必跑检查

```bash
pnpm build:api
pnpm test:api
pnpm lint
pnpm typecheck
```

还要补充 health/OpenAPI smoke 或等价测试。

### 退出条件

- API 可启动、可构建、可测试。
- 危险生产配置能 fail fast。
- OpenAPI 可导出或已有明确导出命令。
- 统一错误和 request id 可测试。
- progress.md 记录 S4 完成证据。

## 6. S5 阶段：Admin core shell

### 目标

把 `apps/admin` 变成干净的官方后台壳层，而不是模板 demo 集合。

### 允许实现

- Layout
- Dashboard shell
- 403/404/500
- 空状态
- request 规范
- access 规范
- registry/mock 菜单消费
- health/OpenAPI 状态入口

### 不允许

- 不真实接入登录
- 不实现 RBAC 数据流
- 不挂载商城/CRM/ERP/MES/WMS 等业务页面
- 不保留污染正式菜单的 demo 页面

### 必跑检查

```bash
pnpm build:admin
pnpm test:admin
pnpm typecheck
pnpm lint
```

如果已有 E2E/smoke，则必须覆盖后台壳层可访问。

### 退出条件

- Admin 可启动、可构建、可测试。
- 正式菜单来自 registry/mock，页面不手写孤立权限。
- request/access 规则有文档或测试保护。
- progress.md 记录 S5 完成证据。

## 7. S6 阶段：auth / RBAC system

### 目标

建立最小可用 RBAC 闭环。

### 允许实现

- Prisma/PostgreSQL 接入
- user
- role
- permission
- menu
- auth baseline
- `Role.code`
- `Permission.code`
- permission guard/decorator
- Admin 用户/角色/权限/菜单页面
- OpenAPI/SDK 同步

S6 是第一个允许持久化业务模型进入的阶段。

### 不允许

- 不做多租户
- 不做组织数据权限
- 不做 SSO/OAuth2
- 不做复杂审计平台

### 必跑检查

```bash
pnpm build
pnpm test
pnpm lint
pnpm typecheck
```

还必须有 RBAC 单测或 E2E，并校验权限码、菜单、OpenAPI、SDK、Admin access 能互相追踪。

### 退出条件

- 登录/RBAC 最小闭环可用。
- `Role.code` 和 `Permission.code` 稳定，不依赖展示名。
- Admin 菜单和按钮权限可追踪。
- OpenAPI/SDK 无 drift。
- progress.md 记录 S6 完成证据。

## 8. S7 阶段：system management

### 目标

完成第一批系统管理能力。

### 允许实现

- dict
- system config
- file asset
- audit log
- login log
- CRUD / pagination / permissions / export baseline
- Admin 对应页面

### 不允许

- 不把工程图片、文章、微信、短信、邮件 provider 放进 core
- 不做大数据异步导出
- 不做完整工作流

### 必跑检查

```bash
pnpm build
pnpm test
pnpm lint
pnpm typecheck
```

还必须覆盖 CRUD、权限矩阵、文件上传 smoke、审计脱敏测试。

### 退出条件

- 字典、参数、文件、登录日志、操作日志可用。
- CRUD、分页、权限、审计链路可跑通。
- 文件中心保持通用 file asset，不混入行业图片业务。
- progress.md 记录 S7 完成证据。

## 9. S8 阶段：monitor / tool baseline

### 目标

建立可观测和工具基线，为 S9 OpenForge 做准备。

### 允许实现

- system status
- version info
- queue read-only status
- OpenAPI drift check
- current-page export template/protocol
- Admin monitor/tool 页面

### 不允许

- 不做完整任务调度平台
- 不做大数据异步导出
- 不暴露敏感配置
- 不做 OpenForge 写文件生成器

### 必跑检查

```bash
pnpm build
pnpm test
pnpm lint
pnpm typecheck
```

还必须覆盖 monitor smoke、queue/status 单测、OpenAPI diff fail test、export test、敏感信息泄漏检查。

### 退出条件

- status/version/queue 页面和 API 可诊断基础依赖。
- OpenAPI drift check 能阻止未提交契约变更。
- 当前页导出模板可复用。
- progress.md 记录 S8 完成证据。

## 10. P4/P5 长期 backlog 规则

OpenCore 的长期目标是覆盖 RuoYi/Yudao 代表的企业后台能力地图，但必须分层实现。

| 队列                 | 能力                                                             | 当前处理                                  |
| -------------------- | ---------------------------------------------------------------- | ----------------------------------------- |
| P4 optional          | 部门/岗位、通知公告、缓存、在线用户、定时任务、报表/工作流设计位 | S8 后按准入规则评估                       |
| P4 integration       | 邮件、短信、微信、OAuth、WebSocket、文件 provider 扩展           | provider 凭据、安全、成本、审计明确后实现 |
| P5 industry/business | member、mall、pay、CRM、ERP、MES、WMS、IoT、IM                   | 独立 industry/app/package，不进入 core    |
| P5 ai                | Knowledge、RAG、Agent、AI workflow                               | AI 安全、审计、成本、权限稳定后实现       |

`not_now` 不是永远不做，只是不进入当前 S3-S8 实现窗口。

## 11. progress.md 更新格式

每轮必须追加：

```markdown
### YYYY-MM-DD Sx execution

- Stage: Sx
- Completed:
  - ...
- Tests:
  - `pnpm ...` pass/fail
- Files changed:
  - ...
- Remaining:
  - ...
- Next:
  - ...
- Scope guard:
  - No P4/P5 module implemented.
```

## 12. 双语 commit summary 格式

每轮结束输出：

```text
<type>(scope): English summary

中文：...
English: ...

Tests:
- ...
```

推荐 type：

```text
feat(s3)
feat(s4)
feat(s5)
feat(s6)
feat(s7)
feat(s8)
docs(strategy)
test(rbac)
chore(openapi)
```

## 13. 给 `/goal` 的短指令

```text
/goal

Read docs/handoff/2026-06-10-s3-s8-implementation-handoff.md and docs/strategy/{README.md,progress.md,staged-roadmap.md,ruoyi-yudao-capability-matrix.md}.
Continue the earliest unfinished S3-S8 stage only. Preserve the long-term RuoYi/Yudao parity backlog, but do not implement P4/P5 modules now.
For every change: update docs/strategy/progress.md, run relevant pnpm checks, fix failures, and stop with a bilingual commit summary plus completed/remaining/test evidence.
```

## 14. 最终验收

S3-S8 全部完成时，必须满足：

- `pnpm format:check` 通过。
- `pnpm lint` 通过。
- `pnpm typecheck` 通过。
- `pnpm test` 通过。
- `pnpm build` 通过。
- API OpenAPI 可导出且 drift check 生效。
- Admin 不手写漂移 API 类型。
- RBAC、系统管理、监控工具都有最小 E2E 或 smoke test。
- `docs/strategy/progress.md` 明确记录每阶段完成证据。
- P4/P5 能力仍在 backlog 中，不被误删，也不被提前实现进 core。
