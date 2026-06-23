# OpenCore Cycle-022 Tenant Foundation Handoff

Date: 2026-06-23
Repository: `Gan-Xing/OpenCore`  
Branch: `main`  
Target track: `Cycle-022 / Tenant Foundation`  
Status: **In progress; T4b login-log tenant isolation implemented, deployed, and verified; T4 core data isolation remains partial**

## 0. Current Round Snapshot

Updated: 2026-06-23

Current completed slice count: **4 full slices**

This working tree has advanced Cycle-022 through the first four full deployable tenant foundation slices plus T4a online-session tenant isolation and T4b login-log tenant isolation:

- Prisma models for `TenantPlan`, `TenantPlanModule`, `Tenant`, `TenantMembership`, `TenantMembershipRole`, `TenantMembershipPost`, `PlatformRole`, `UserPlatformRole`, and `PlatformRolePermission`.
- Migration `20260622223000_tenant_foundation` creates the `root` tenant, root `system.full` plan, root memberships for existing users, and transitional root copies of `UserRole` and `UserPost`.
- `prisma/seed.ts` includes repeatable `seedTenancy()` to sync root plan modules from module registry and keep root memberships/backfill current.
- Module registry now admits `core.tenant`, `core.tenant-plan`, and `core.tenant-member`, with targeted `platform:tenant*` permission support.
- API/SDK/Admin T1 surface is read-only: `GET /api/core/tenancy/foundation`, `createTenancyClient()`, and `/system/tenants`.
- `pnpm guard:tenant-foundation` and `pnpm smoke:core-tenancy-foundation` were added.
- Repository lint/typecheck/test, refreshed deploy, local/public tenant foundation smoke, and public Admin route checks passed for this slice.
- Migration `20260623003000_tenant_bound_sessions` adds tenant/member/access-mode fields to `OnlineUserSession`.
- Access tokens now carry tenant id, membership id, and access mode; authenticated sessions are registered with the same context.
- `SecurityAuthService` validates token/session tenant context, tenant status, and membership status on each bearer request.
- `/api/auth/select-tenant` and `/api/auth/switch-tenant` reissue tenant-bound sessions; switch revokes the previous token.
- `RequestContext` now carries actor, tenant, membership, and access mode populated by authenticated guards.
- Admin login accepts an optional tenant code and no longer stores a token unless the login response is authenticated.
- `pnpm guard:tenant-auth` and `pnpm smoke:core-tenancy-auth` were added.
- Refreshed deploy completed on API `39172` and Admin `39174`; tenant foundation/auth smokes passed against local and public API.
- Active authenticated users now prefer `TenantMembershipRole` and `TenantMembershipPost` over legacy `UserRole`/`UserPost`.
- Tenant membership permissions are clipped by the active tenant plan's enabled module codes.
- Security data-scope resolution now uses the active membership id, so member department and member role data scope drive protected user queries.
- Auth responses and SDK types expose membership-derived `postCodes`.
- `pnpm guard:tenant-rbac` and `pnpm smoke:core-tenant-rbac` were added for this T3a closure.
- Refreshed deploy completed on API `39172` and Admin `39174`; tenant foundation/auth/RBAC smokes passed against local and public API.
- Migration `20260623093000_tenant_scoped_roles` makes `Role` tenant-owned, rewrites role code uniqueness to `(tenantId, code)`, and enforces `TenantMembershipRole(tenantId, roleId)` against `Role(tenantId, id)`.
- `PrismaSystemRoleRepository` now resolves the active tenant from `RequestContext`, scopes Role list/get/create/update/delete by tenant, and keeps the legacy user-role bridge pinned to `tenant_root`.
- Seeded roles upsert by `(tenant_root, code)`; seeded users attach only root roles.
- `pnpm guard:tenant-role-scope` and `pnpm smoke:core-tenant-role` were added for the T3b Role catalog closure.
- Refreshed deploy completed on API `39172` and Admin `39174`; tenant foundation/auth/RBAC/role smokes passed against local and public API.
- Migration `20260623113000_tenant_scoped_posts` makes `SystemPost` tenant-owned, rewrites post code uniqueness to `(tenantId, code)`, and enforces `TenantMembershipPost(tenantId, postId)` against `SystemPost(tenantId, id)`.
- `PrismaSystemPostRepository` now resolves the active tenant from `RequestContext`, scopes Post list/options/get/create/update/delete/batch/order operations by tenant, and keeps the legacy user-post bridge pinned to `tenant_root`.
- Seeded posts upsert by `(tenant_root, code)`; seeded users attach only root posts.
- `pnpm guard:tenant-post-scope` and `pnpm smoke:core-tenant-post` were added for the T3c Post catalog closure.
- Refreshed deploy completed on API `39172` and Admin `39174`; tenant foundation/auth/RBAC/role/post smokes passed against local and public API.
- Migration `20260623143000_tenant_scoped_departments` makes `SystemDept` tenant-owned, rewrites department code uniqueness to `(tenantId, code)`, and adds composite same-tenant checks for department parents and membership departments.
- `PrismaSystemDeptRepository` now resolves the active tenant from `RequestContext`, scopes Department tree/options/get/create/update/order/delete operations by tenant, and rejects cross-tenant parents.
- Root legacy `User.deptId`, seed user departments, Role custom data-scope department validation, and RBAC descendant department lookup are pinned/scoped to the correct tenant.
- Tenant department guard and smoke aliases were added for the T3d Department catalog closure.
- Refreshed deploy completed on API `39172` and Admin `39174`; tenant foundation/auth/RBAC/role/post/dept smokes passed against local and public API.
- Active-tenant member assignment APIs were added under `GET /api/core/tenancy/members` and `PATCH /api/core/tenancy/members/:membershipId/assignments`.
- Member assignment derives tenant ownership from authenticated `RequestContext`, validates membership/department/role/post ownership in that tenant, and ignores any client-supplied body/query/header tenant selector.
- Root tenant assignment updates sync back to legacy `User.enabled`, `User.deptId`, `UserRole`, and `UserPost` so single-mode System User flows stay compatible.
- SDK tenancy client/types and the live `/system/tenants` Admin page now expose current-tenant members and an assignment modal for status, department, roles, and posts.
- Tenant member assignment guard and smoke coverage were added and wired into local/deploy smoke scripts for the T3e Tenant Member assignment closure.
- Refreshed deploy completed on API `39172` and Admin `39174`; tenant foundation/auth/RBAC/role/post/dept/member smokes passed against local and public API.
- `PrismaOnlineUserRepository` now scopes monitor list/detail/summary/cleanup/kick-out operations to `RequestContext.tenantId`, with `tenant_root` fallback for single-mode compatibility.
- Auth session registration, bearer token validation, and direct token revocation remain token-scoped so authentication does not depend on monitor UI tenant scope.
- Online-session seed records and SDK fixtures now include root tenant fields for `session_operator`; Admin Online Users displays access mode, tenant id, and membership id from live data.
- `smoke:core-online-user` seeds a foreign tenant session and proves root-scope list/detail/single-kick/batch-kick/expired-cleanup do not cross tenants.
- `pnpm guard:tenant-online-user-scope` was added for the T4a Online Session isolation closure.
- Refreshed deploy completed on API `39172` and Admin `39174`; tenant foundation/auth/RBAC/role/post/dept/member and online-user smokes passed against local and public API.
- Migration `20260623163000_tenant_scoped_login_logs` makes `LoginLog` tenant-owned with root backfill, tenant/date indexes, and a tenant FK.
- `PrismaAuditLoginLogRepository` now resolves the active tenant from `RequestContext`, scopes list/detail/export/delete/clean operations, and records new login attempts under the selected session tenant or root fallback.
- Login-log seed records, OpenAPI DTO, SDK summary fixture, and Admin Login Logs now expose `tenantId`.
- `smoke:core-login-log` seeds a foreign tenant login log and proves root-scope list/detail/delete/clean do not cross tenants.
- `pnpm guard:tenant-login-log-scope` was added for the T4b Login Log isolation closure.
- Refreshed deploy completed on API `39172` and Admin `39174`; local deploy smoke and public API login-log smoke passed.

Still not complete:

- tenant-scoped System/core repositories for dict, config, notices, files, operation audit logs, and other non-org data;
- Redis/file/queue/WebSocket/Integration/OAuth/audit runtime propagation;
- Tenant Plan CRUD, Tenant Member CRUD/invitation, Admin switcher, and platform visit mode beyond active-tenant member assignment;
- platform visit/impersonation audit.

---

## 1. Handoff Purpose

本文件是 OpenCore 下一阶段“多租户基础设施”的执行交接文档，供后续 AI 直接阅读并继续实施。

本轮不是新增一个普通的“租户管理 CRUD 页面”，而是给 OpenCore 增加一条完整的 SaaS 安全边界：

```text
租户识别
→ 用户与租户成员关系
→ 租户绑定认证
→ 数据库行级隔离
→ 权限和菜单隔离
→ Redis 隔离
→ 文件对象隔离
→ BullMQ / Scheduler 租户上下文传播
→ 日志和审计租户归属
→ Admin 租户管理与租户切换
```

本文件必须作为 Cycle-022 的主要架构依据。后续 AI 不应把“租户管理页面已完成”视为“多租户已完成”。

---

## 2. Executive Decision

### 2.1 已确定的方向

OpenCore 采用：

> **JeecgBoot 风格的全局用户与租户成员关系 + 芋道风格的统一租户上下文和全链路隔离。**

具体决策：

1. `User` 保持全局身份，一个用户可以加入多个租户。
2. 新增 `TenantMembership` 表示用户在某一租户中的成员身份。
3. 部门、岗位、租户角色归属于成员关系，不再直接归属于全局 `User`。
4. 数据库采用 PostgreSQL 共享库、共享 schema、行级 `tenantId` 隔离。
5. 普通请求不能信任前端传入的 `tenantId`；当前租户必须由服务端认证上下文确定。
6. Access Token / Session 必须绑定当前 `tenantId` 和 `membershipId`。
7. `Permission`、`Menu`、module registry、Area 数据等平台目录保持全局。
8. 租户套餐以 OpenCore 的 `moduleCode` / `permissionCode` 为授权依据，不照搬芋道的菜单数据库 ID 模型。
9. Redis、MinIO/S3、BullMQ、WebSocket、Outbox、OAuth、审计日志全部必须传播租户上下文。
10. 多租户作为 `core` 安全基础设施，不再命名为 `optional.tenant`。

### 2.2 不需要推倒重写

OpenCore 当前 package、repository、contracts、SDK、module-registry 和 composition root 的分层适合渐进改造。

需要大改的是横切边界，而不是重新搭项目：

- 认证上下文；
- RBAC 关系；
- Prisma 数据所有权；
- 唯一约束；
- Redis / 文件 / 队列 namespace；
- 租户控制面页面。

### 2.3 建议支持两种运行模式

```text
OPENCORE_TENANCY_MODE=single
OPENCORE_TENANCY_MODE=shared
```

- `single`：自动进入默认 `root` 租户，对单客户独立部署保持低复杂度。
- `shared`：启用租户发现、选择、切换和严格数据隔离。

两种模式使用同一套租户数据模型，避免维护两套业务代码。

---

## 3. Current OpenCore State

OpenCore 已经完成单租户企业后台的大部分基础产品化，不是 skeleton 阶段：

- System 用户、角色、权限、菜单、部门、岗位、字典、配置、通知、文件；
- Security 登录策略、会话、在线用户、登录日志、操作日志；
- Monitor jobs、cache、runtime diagnostics；
- Integration provider、模板、outbox、OAuth；
- Collaboration message、notice、todo、approval-lite；
- OpenForge 和 module registry；
- Admin live-only、public smoke 和 deploy guard。

当前项目状态可以概括为：

> **单租户平台基础已完成，多租户平台基础尚未建设。**

当前代码没有完整的 tenant runtime：

- `RequestContext` 已有 `requestId`、`traceId`、`actorUserId`、`tenantId`、`membershipId`、`accessMode`，但多数 repository 尚未消费 tenant 字段；
- Access Token 已有 `sub`、`jti`、`iat`、`exp`、`tid`、`mid`、`am`；
- `AuthenticatedUser` 已优先使用当前 `TenantMembershipRole` / `TenantMembershipPost`，权限会按租户套餐 module 裁剪；legacy `UserRole` 仅保留为 seed/in-memory fallback；
- `PrismaService` 是裸 `PrismaClient`，没有 tenant-scoped client；
- Redis key 没有 tenant namespace；
- 文件 key 默认是 `runtime/file-assets/...`；
- Scheduler handler input 没有 `tenantId`；
- 多数 Prisma Model 使用全局唯一约束；
- Repository 普遍按 `id`、`code`、`username` 直接查询。

因此，仅新增 `Tenant` 表和 Admin 页面会形成“有租户页面但没有租户隔离”的假多租户，禁止这样实施。

---

## 4. Reference Projects and What to Learn

## 4.1 芋道 `YunaiV/ruoyi-vue-pro`

重点参考：

```text
yudao-framework/yudao-spring-boot-starter-biz-tenant/
  config/TenantProperties.java
  config/YudaoTenantAutoConfiguration.java
  core/context/TenantContextHolder.java
  core/db/TenantBaseDO.java
  core/db/TenantDatabaseInterceptor.java
  core/web/TenantContextWebFilter.java
  core/security/TenantSecurityWebFilter.java
  core/web/TenantVisitContextInterceptor.java

yudao-module-system/
  dal/dataobject/tenant/TenantDO.java
  dal/dataobject/tenant/TenantPackageDO.java
  service/tenant/TenantServiceImpl.java

yudaocode/yudao-ui-admin-vue3/
  src/views/system/tenant/index.vue
  src/views/system/tenant/TenantForm.vue
  src/views/system/tenantPackage/index.vue
  src/views/system/tenantPackage/TenantPackageForm.vue
```

应学习：

- 请求上下文统一保存当前租户；
- 登录用户租户和请求租户必须一致；
- 租户禁用、过期必须在安全过滤层统一拦截；
- DB、Redis、MQ、Job 全链路传播租户；
- 创建租户时自动创建管理员和管理员角色；
- 套餐变化后，角色权限必须收缩到套餐允许范围；
- 平台管理员跨租户访问必须使用显式访问模式。

不应照搬：

- Java `ThreadLocal`：Node/NestJS 应使用 `AsyncLocalStorage`；
- 认为一个 SQL 拦截器可以覆盖所有安全场景；
- 用菜单数据库 ID 作为租户产品能力的长期契约；
- 默认所有表自动 tenant 化而缺少明确的数据归属分类。

## 4.2 JeecgBoot `jeecgboot/JeecgBoot`

重点参考：

```text
jeecg-boot/jeecg-module-system/jeecg-system-biz/
  entity/SysTenant.java
  entity/SysUserTenant.java
  entity/SysTenantPack.java
  service/impl/SysTenantServiceImpl.java

jeecg-boot/jeecg-boot-base-core/
  config/mybatis/MybatisPlusSaasConfig.java
  config/mybatis/MybatisInterceptor.java

jeecgboot-vue3/
  src/views/system/tenant/index.vue
  src/views/sys/login/LoginSelect.vue
  src/utils/http/axios/index.ts
```

应学习：

- 全局用户通过 `SysUserTenant` 加入多个租户；
- 多租户用户登录后选择当前租户；
- 租户后台支持邀请用户、查看用户、产品包、回收站；
- 当前租户在前端有明确的选择和展示。

不应照搬：

- 将前端 Header 作为最终可信租户来源；
- 缺省 `tenantId = 0` 的隐式平台语义；
- 仅对白名单表开启 tenant 条件而缺少架构级防回归守卫；
- 让用户实体同时承担过多“当前租户临时字段”。

---

## 5. Core Terminology

### Tenant

一个被隔离的公司、组织或工作空间，是 SaaS 数据边界。

### Global User

全局登录身份。密码、邮箱、手机、头像和社交账号归属于全局用户。

### Tenant Membership

用户在某一个租户内的成员身份，承载：

- 租户；
- 部门；
- 岗位；
- 租户角色；
- 成员状态；
- 所有者/管理员信息。

### Platform Control Plane

平台运营方使用的全局控制面，例如租户、套餐、模块目录、全局权限目录。

### Tenant Data Plane

某一租户内的组织、配置、通知、文件、协作和未来业务数据。

### Platform Visit / Impersonation

平台管理员显式进入某一租户进行排障或运营操作。必须有专门权限、原因、时限和审计记录。

---

## 6. Non-Negotiable Security Invariants

1. 租户数据的创建接口不接收或忽略普通请求 Body 中的 `tenantId`。
2. 当前租户必须来自服务端验证后的认证上下文。
3. 修改 `tenant-id` Header 不能切换租户或越权。
4. 切换租户必须调用服务器接口，并重新签发 tenant-bound token。
5. 所有 tenant-owned Repository 方法必须使用 tenant-scoped Prisma client 或显式 tenant 条件。
6. 通过已知 ID 猜测其他租户数据时返回 404，不泄露对象存在性。
7. 用户、角色、部门、岗位等关联操作必须校验双方属于同一租户。
8. `updateMany`、`deleteMany`、批量分配、导入、导出都必须带租户边界。
9. Raw SQL 必须进入专门白名单，并显式携带租户条件。
10. Redis key、文件对象 key、队列 payload、WebSocket room 必须携带租户 namespace。
11. 平台管理员跨租户访问必须显式、可撤销、可审计。
12. 租户边界永远优先于部门 data scope；部门权限不能突破租户边界。
13. 被禁用、过期的租户不得登录、切换、执行任务或处理 Outbox。
14. 被冻结、退出或删除的成员不得继续使用已有 session。
15. 所有租户安全回归必须进入自动化测试、smoke 或 deploy guard。

---

## 7. Target Identity and RBAC Model

## 7.1 `User` 保持全局

保留现有全局身份字段：

```text
User
- id
- username
- displayName
- mobile
- email
- passwordHash
- avatar...
- enabled
```

V1 继续保持 `username` 全局唯一，降低迁移风险。未来如果产品需要“每个租户都可以有 admin 用户名”，再增加租户内 `loginAlias`，不要在本轮同时改变登录主标识。

## 7.2 新增租户成员关系

```text
TenantMembership
- id
- tenantId
- userId
- status: invited | active | suspended | left
- isOwner
- deptId
- invitedByUserId
- joinedAt
- lastActiveAt
- createdAt
- updatedAt
```

约束：

```text
unique(tenantId, userId)
```

## 7.3 迁移用户组织关系

当前：

```text
User.deptId
UserRole(userId, roleId)
UserPost(userId, postId)
```

目标：

```text
TenantMembership.deptId
TenantMembershipRole(membershipId, roleId)
TenantMembershipPost(membershipId, postId)
```

同一个全局用户在不同租户可拥有不同部门、岗位和角色。

## 7.4 平台权限和租户权限分离

最终建议存在两类授权关系：

```text
PlatformRole / UserPlatformRole / PlatformRolePermission
TenantRole / TenantMembershipRole / TenantRolePermission
```

两者共享全局 `Permission` 目录，但授权主体不同。

- 平台角色：管理租户、套餐、平台配置、跨租户访问。
- 租户角色：管理当前租户的用户、部门、配置、通知、文件和业务模块。

不要让“root 租户管理员”天然拥有所有平台权限。

## 7.5 有效权限计算

租户用户的有效权限应满足：

```text
module registry 中存在
AND tenant plan 允许该 module
AND tenant role 授予该 permission
AND 当前成员和租户均有效
```

菜单生成也必须使用同一套有效权限结果，避免“菜单隐藏但 API 可访问”或“菜单显示但套餐未授权”。

---

## 8. Tenant and Plan Model

## 8.1 Tenant

建议字段：

```text
Tenant
- id
- code / slug（全局唯一）
- name
- status: active | suspended | expired
- planId
- contactName
- contactMobile
- accountLimit
- expiresAt
- createdByUserId
- createdAt
- updatedAt
```

规则：

- 不硬删除已产生业务数据的租户；默认使用停用或归档。
- 内置默认租户不可删除。
- `slug` 可用于未来域名解析和登录租户发现。

## 8.2 TenantPlan

建议字段：

```text
TenantPlan
- id
- code（全局唯一）
- name
- enabled
- limits Json
- remark
- createdAt
- updatedAt
```

## 8.3 TenantPlanModule

```text
TenantPlanModule
- planId
- moduleCode
```

`moduleCode` 必须引用并校验 OpenCore module registry 中的稳定 code，例如：

```text
system.user
system.role
system.notice
monitor.job
integration.provider
```

不要存菜单数据库 ID。菜单只是 module/permission 的一个展示结果，不应成为产品授权契约。

套餐修改规则：

- 新增 module：租户管理员可在允许范围内自行授权角色；
- 移除 module：所有租户角色权限必须和新套餐能力求交集；
- API 和 Admin 菜单必须同时失效；
- 套餐变更写入审计日志。

---

## 9. Current Prisma Model Ownership Matrix

以下分类是实施前的默认决策。若代码事实发生变化，必须先更新本矩阵，再改 schema。

| Current model                      | Target ownership                              | Required action                                                                 |
| ---------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------- | --------------------------- |
| `User`                             | Global identity                               | 保持全局；移出直接 dept/role/post 关系                                          |
| `Role`                             | Tenant-owned                                  | 演进为 `TenantRole`，增加 `tenantId`，code 改租户内唯一                         |
| `Permission`                       | Global catalog                                | 保持全局唯一，不加 `tenantId`                                                   |
| `Menu`                             | Global catalog                                | 保持全局，不复制每租户菜单                                                      |
| `UserRole`                         | Obsolete                                      | 迁移为 `TenantMembershipRole`                                                   |
| `UserPost`                         | Obsolete                                      | 迁移为 `TenantMembershipPost`                                                   |
| `RolePermission`                   | Tenant authorization                          | 通过 tenant role 隔离；建议关系表保留 `tenantId` 做复合约束                     |
| `DictType`                         | Tenant-owned with optional system definitions | 增加 tenant scope 或拆分系统字典与租户字典                                      |
| `DictItem`                         | Tenant-owned child                            | 跟随 DictType；禁止跨租户 typeId                                                |
| `SystemConfig`                     | Mixed                                         | 拆为全局 `ConfigDefinition` 与 `TenantConfigValue`                              |
| `SystemConfigEnvironmentOverride`  | Tenant-owned value                            | 迁移到租户配置覆盖模型                                                          |
| `SystemConfigSecretVersion`        | Tenant-owned secret                           | 增加 tenant ownership，密钥和审计必须隔离                                       |
| `SystemNotice`                     | Tenant-owned                                  | 增加 `tenantId`                                                                 |
| `SystemNoticeTemplate`             | Tenant-owned or system template               | 明确 `system/tenant` scope，租户模板必须隔离                                    |
| `SystemNoticeReadReceipt`          | Tenant-owned child                            | 增加或继承 tenant，校验 notice/member 同租户                                    |
| `SystemNoticeDelivery`             | Tenant-owned child                            | 增加 tenant，provider 选择必须使用该租户配置                                    |
| `SystemDept`                       | Tenant-owned                                  | 增加 `tenantId`，code 改租户内唯一                                              |
| `SystemPost`                       | Tenant-owned                                  | 增加 `tenantId`，code 改租户内唯一                                              |
| `FileAsset`                        | Tenant-owned                                  | 增加 `tenantId`，对象 key 加 tenant prefix                                      |
| `AuditLog`                         | Explicit scoped event                         | 增加 `scope=platform                                                            | tenant`与受约束的`tenantId` |
| `LoginLog`                         | Explicit scoped event                         | 登录前可无 tenant；选择租户后记录 tenant，使用显式 scope                        |
| `LoginLockout`                     | Global credential security                    | V1 保持全局；用户名锁定不依赖前端租户                                           |
| `CollaborationMessage`             | Tenant-owned                                  | 增加 `tenantId`，sender/recipient 使用 member/user identity 明确化              |
| `CollaborationNotice`              | Tenant-owned                                  | 增加 `tenantId`                                                                 |
| `CollaborationTodo`                | Tenant-owned                                  | 增加 `tenantId`                                                                 |
| `CollaborationApprovalLite`        | Tenant-owned                                  | 增加 `tenantId`                                                                 |
| `JobDefinition`                    | Platform runtime currently                    | 当前 maintenance jobs 保持平台级；未来新增独立 tenant schedule 模型或显式 scope |
| `JobRunLog`                        | Explicit scoped event                         | 增加 scope/tenant 快照，tenant job 不得丢失上下文                               |
| `OnlineUserSession`                | Tenant-bound access session                   | 增加 `tenantId`、`membershipId`、`accessMode`                                   |
| `ReportDefinition`                 | Tenant-owned                                  | 未来启用时增加 `tenantId`；当前不作为 Cycle-022 主功能                          |
| `IntegrationProvider`              | Mixed                                         | 拆为全局 driver/catalog 与 `TenantIntegrationProvider` 实例                     |
| `IntegrationProviderAuditLog`      | Tenant-owned audit                            | 增加 tenant 快照                                                                |
| `IntegrationTemplate`              | Tenant-owned                                  | 增加 `tenantId`，code 改租户内唯一                                              |
| `IntegrationOutbox`                | Tenant-owned runtime                          | 增加 tenant，worker 必须恢复上下文                                              |
| `IntegrationOAuthToken`            | Tenant-owned secret                           | 增加 tenant，provider instance 和 subject 必须同租户                            |
| `IntegrationOAuthFlow`             | Tenant-owned flow                             | state 必须绑定 tenant                                                           |
| `IntegrationOAuthCallbackAudit`    | Tenant-owned audit                            | callback 必须恢复并校验 tenant                                                  |
| `IntegrationWebSocketRuntimeEvent` | Tenant-owned/scoped                           | room 和 event 必须带 tenant namespace                                           |
| `AreaDatasetVersion`               | Global master data                            | 保持全局                                                                        |
| `AreaRegion`                       | Global master data                            | 保持全局                                                                        |
| `AreaIpRange`                      | Global master data                            | 保持全局                                                                        |

注意：

- “平台事件和租户事件共表”时，不允许仅凭 `tenantId = null` 猜测语义。
- 必须有显式 `scope`，并通过数据库 check constraint 保证：

```text
scope = platform -> tenantId IS NULL
scope = tenant   -> tenantId IS NOT NULL
```

---

## 10. Unique Constraint Migration

以下全局唯一约束需要改成租户内复合唯一：

```text
Role.code
SystemDept.code
SystemPost.code
DictType.code
TenantConfig.key
SystemNoticeTemplate.code
IntegrationTemplate.code
TenantIntegrationProvider.code
TenantSchedule.code
ReportDefinition.code
```

目标示例：

```text
unique(tenantId, code)
```

继续保持全局唯一：

```text
Tenant.slug
TenantPlan.code
Permission.code
Menu.key
User.username（V1）
AreaDatasetVersion.version
```

迁移时不能先删除旧唯一约束再回填数据。正确顺序：

1. 增加 nullable tenant 字段；
2. 创建默认租户；
3. 回填所有现有行；
4. 校验无 null、无冲突；
5. 创建复合唯一索引；
6. 修改读写代码；
7. 将 tenant 字段改为 `NOT NULL`；
8. 删除旧全局唯一索引。

---

## 11. Authentication and Tenant Selection Flow

## 11.1 Login flow

推荐流程：

```text
POST /auth/login
  输入 username/password
  校验全局 User
  查询 active TenantMembership

  0 个成员：拒绝或只允许 platform operator 登录
  1 个成员：直接为该成员签发 tenant-bound token
  多个成员：返回短时 loginTicket + tenant options

POST /auth/select-tenant
  输入 loginTicket + tenantId
  校验 membership、tenant status、expiry
  签发 tenant-bound token
```

## 11.2 Switch flow

```text
POST /auth/switch-tenant
  使用当前 token
  输入目标 tenantId
  校验用户是目标租户 active member
  校验租户有效
  撤销旧 token 或结束旧 tenant access session
  签发新的 tenant-bound token
```

禁止只修改本地 Header 完成切换。

## 11.3 Token payload

当前 token 只有 `sub/jti/iat/exp`。目标至少包含：

```text
sub           global user id
jti           token/session id
tenantId      active tenant
membershipId  active membership
accessMode    tenant | platform | platform-visit
iat
exp
```

## 11.4 Authenticated user response

目标增加：

```text
user
activeTenant
activeMembership
tenantOptions（必要时通过单独接口返回）
roleCodes
permissionCodes
enabledModuleCodes
```

不要把所有租户的完整权限都塞进 token；权限仍可从服务端加载并缓存。

---

## 12. Request Context

当前 `packages/core/src/request-context.ts` 应扩展为：

```text
RequestContext
- requestId
- traceId
- actorUserId?
- tenantId?
- membershipId?
- accessMode: anonymous | platform | tenant | platform-visit
- platformVisitReason?
```

Node/NestJS 使用现有 `AsyncLocalStorage` 继续实现，不创建第二套不相干的 tenant storage。

上下文建立顺序：

```text
request/trace middleware
→ bearer authentication
→ tenant/membership validation
→ request context enrichment
→ controller/service/repository
```

匿名 URL、登录 URL、外部 callback 必须使用显式策略，不得默认进入 root tenant。

---

## 13. Prisma and Repository Architecture

## 13.1 两类数据库访问

建议提供两类明确 client：

```text
PlatformPrisma
TenantPrisma
```

### PlatformPrisma

只允许访问：

- Tenant / TenantPlan；
- User global identity；
- Permission / Menu / module catalog；
- Area global data；
- 明确的平台日志和运行时数据。

### TenantPrisma

必须存在有效 `TenantContext`：

- 创建时自动注入 tenantId；
- 查询、更新、删除自动附加 tenantId；
- 禁止业务代码修改 tenantId；
- find-by-id 也必须验证 tenant；
- 批量操作同样强制 tenant 条件。

## 13.2 不要只依赖自动拦截

即便使用 Prisma Client Extension，也必须保持：

- Repository 接口明确是 platform-scoped 还是 tenant-scoped；
- 关系写入校验双方 tenant；
- raw query 单独封装；
- 架构 guard 禁止 tenant package 直接注入裸 `PrismaService`；
- 测试覆盖 `findUnique`、`updateMany`、`deleteMany`、transaction 和 nested writes。

## 13.3 Composite foreign key

高风险关系表建议重复保存 tenantId，并使用复合关系保证无法跨租户连接。例如：

```text
TenantMembershipRole
- tenantId
- membershipId
- roleId
```

应用层和数据库层同时保证 membership 与 role 属于同一 tenant。

## 13.4 PostgreSQL RLS

RLS 可作为第二层纵深防御，但不作为第一轮唯一安全机制。

顺序：

```text
应用层 TenantPrisma 稳定
→ 完整跨租户测试
→ 高风险表增加 RLS
```

高风险候选：

- TenantMembership；
- TenantRole；
- TenantConfigSecret；
- FileAsset；
- AuditLog；
- Integration OAuth / Provider secret；
- Outbox。

---

## 14. Redis Isolation

当前 Redis key factory 不知道 tenant。目标 namespace：

```text
opencore:{env}:tenant:{tenantId}:config:...
opencore:{env}:tenant:{tenantId}:session:...
opencore:{env}:tenant:{tenantId}:notice:...
opencore:{env}:tenant:{tenantId}:provider:...
```

平台缓存：

```text
opencore:{env}:platform:...
```

要求：

- 禁止 tenant data 使用无 tenant 的 key factory；
- prefix clear 必须限制在当前 tenant；
- Monitor Cache 的平台页面需要明确 platform/tenant scope；
- 平台管理员清理租户缓存必须显式指定租户并审计。

---

## 15. File and Object Storage Isolation

当前文件对象 key 应改为：

```text
tenants/{tenantId}/file-assets/{fileId-or-digest}-{safeName}
```

平台资产：

```text
platform/assets/...
```

下载规则：

1. 先按当前 tenant 查询 `FileAsset`；
2. 验证文件归属；
3. 再签发下载或读取对象；
4. 不允许仅凭 storageKey 下载；
5. 头像若为全局 User 头像，需要单独定义 global identity storage scope，不混入 tenant file。

---

## 16. BullMQ, Scheduler and Background Work

每个 tenant job payload 必须包含：

```text
tenantId
actorUserId
membershipId?
requestId
traceId
```

Worker 执行顺序：

```text
读取 payload
→ 校验 tenant 仍有效
→ 建立 TenantContext
→ 执行业务
→ 写 tenant-scoped run log/audit
→ 清理 context
```

当前 maintenance jobs（OpenAPI drift、全局审计清理等）保持 platform scope。

不要把 platform maintenance job 静默转换成 tenant job。未来租户任务应使用独立模型或显式 `scope`。

---

## 17. Integration, OAuth, Outbox and WebSocket

### Integration Provider

当前模型混合了 provider 类型和实例配置，建议拆分：

```text
IntegrationProviderDriver      Global
TenantIntegrationProvider      Tenant-owned
```

租户实例承载：

- config；
- secretRef；
- health；
- configVersion；
- audit；
- enabled。

### Outbox

每条 Outbox 必须固定：

- tenantId；
- provider instance；
- template；
- recipient；
- retry state。

A 租户的消息绝不能使用 B 租户的 SMTP/SMS 配置。

### OAuth

OAuth state 必须绑定：

```text
tenantId
providerInstanceId
subjectId
redirectUri
expiry
```

callback 不能只凭 provider code 寻找 token。

### WebSocket

room 命名：

```text
tenant:{tenantId}:user:{userId}
tenant:{tenantId}:notice
tenant:{tenantId}:collaboration
```

禁止广播到无 tenant namespace 的业务 room。

---

## 18. Admin Product Surface

## 18.1 Platform control plane

第一阶段页面：

```text
/system/tenants
/system/tenant-plans
/system/tenants/:id/members
```

功能：

### Tenants

- 列表、搜索、详情；
- 新建租户；
- 修改基本资料；
- 启用、停用、过期；
- 查看套餐、成员数、账号额度；
- 不提供危险硬删除作为默认操作；
- 平台访问租户必须输入原因并记录审计。

### Tenant Plans

- 套餐 CRUD；
- module registry 模块树选择；
- limits JSON 或结构化额度；
- 查看使用该套餐的租户；
- 套餐变更影响预览；
- 权限收缩确认。

### Tenant Members

- 查看成员；
- 邀请已有全局用户；
- 创建/邀请新全局用户；
- 冻结、恢复、移除；
- 分配部门、岗位、租户角色；
- 所有者转移需要高风险确认。

## 18.2 Tenant switcher

Admin 顶部增加当前租户展示和切换器：

- 一个成员租户时不打扰用户；
- 多个租户时可切换；
- 切换调用后端并重新签发 token；
- 切换后重新加载权限、菜单、配置和通知；
- 平台访问模式有明显视觉提示，不与正常租户身份混淆。

## 18.3 Existing System pages

用户、角色、部门、岗位、字典、配置、通知、文件页面必须自动工作在当前租户范围内。

不要在每个页面增加一个普通用户可编辑的 tenant selector。

---

## 19. Module Registry Decision

当前历史代码里曾禁止 `optional.tenant` 在 S3-S8 进入。S3-S8 已完成，且用户已经明确准入多租户。

实施时：

1. 不注册 `optional.tenant`；
2. 注册核心模块：

```text
core.tenant
core.tenant-plan
core.tenant-member
```

3. Admin 页面可位于 System/Platform 管理菜单；
4. 新权限建议：

```text
platform:tenant:read
platform:tenant:create
platform:tenant:update
platform:tenant:suspend
platform:tenant:visit
platform:tenant-plan:read
platform:tenant-plan:manage
platform:tenant-member:read
platform:tenant-member:manage
```

5. module admission、permission、menu、OpenAPI、SDK、smoke 必须一起闭环。

---

## 20. Migration Strategy

禁止一次性修改所有表和所有 Repository。

## T0 — Docs-only architecture admission

第一轮必须先完成：

- 本 handoff 入库或同步；
- `tenant-architecture.md` ADR；
- Prisma model ownership matrix；
- acceptance matrix；
- finite backlog；
- threat model；
- single/shared mode 决策；
- 不改 runtime，不部署。

## T1 — Foundation models and root tenant

新增：

- Tenant；
- TenantPlan；
- TenantPlanModule；
- TenantMembership；
- 平台授权基础模型；
- 默认 root tenant；
- admin 的 root membership。

这一步先不切换所有业务查询。

## T2 — Auth and tenant context

- 扩展 token payload；
- 扩展 OnlineUserSession；
- 登录返回租户选项；
- select/switch tenant；
- 扩展 RequestContext；
- 租户禁用和成员冻结即时失效；
- Header tampering 测试。

## T3 — System organization and RBAC

优先迁移：

1. TenantRole；
2. SystemDept；
3. SystemPost；
4. TenantMembershipRole；
5. TenantMembershipPost；
6. RolePermission；
7. Users Admin 改为成员管理视角。

采用双写/双读过渡，确认数据一致后再删除旧 `UserRole`、`UserPost` 和 `User.deptId`。

## T4 — TenantPrisma and core tenant data

依次迁移：

- Dict；
- Config；
- Notice；
- File；
- Audit/Login Log；
- Online Session。

每完成一个模块，都要增加两租户交叉访问测试和 Admin live smoke。

## T5 — Runtime propagation

- Redis namespace；
- MinIO/S3 object key；
- BullMQ payload/context；
- Scheduler scope；
- Integration provider/outbox；
- OAuth callback；
- WebSocket room。

## T6 — Admin control plane

- Tenants；
- Tenant Plans；
- Members；
- Header switcher；
- Platform visit mode；
- public API/Admin smoke；
- deploy guard。

## T7 — Remaining optional/business models

最后再迁移：

- Collaboration；
- Reports；
- 未来 CRM/ERP/Mall/AI 等业务域。

---

## 21. Existing Data Backfill

默认建立：

```text
Tenant
- code: root
- name: Root Tenant
- status: active
- plan: system/full
```

现有数据处理：

```text
现有 admin User
→ 保留 global User
→ 创建 root TenantMembership(owner=true)

现有 Role
→ 迁入 root TenantRole

现有 UserRole
→ 转换为 root TenantMembershipRole

现有 UserPost
→ 转换为 root TenantMembershipPost

现有 User.deptId
→ 转移到 root TenantMembership.deptId

现有 Dept/Post/Dict/Config/Notice/File
→ tenantId = root
```

迁移必须可重复执行并具备校验脚本：

- 行数对比；
- orphan 检查；
- duplicate 检查；
- null tenant 检查；
- cross-tenant relation 检查；
- 回滚说明。

---

## 22. Acceptance Matrix

Cycle-022 不以“页面能打开”为完成标准。

### 22.1 Identity and auth

- 全局用户可加入多个租户；
- 单租户成员自动进入；
- 多租户成员可选择租户；
- 切换租户重新签发 token；
- 非成员不可切换；
- suspended tenant/member 的旧 session 立即不可用；
- token tenant、membership 和 session 一致。

### 22.2 Database isolation

- A 租户无法 list/get/update/delete/export B 租户数据；
- 猜测 B 的 ID 返回 404；
- 批量操作不能越过租户；
- nested relation 不能连接其他租户对象；
- transaction 和 raw query 有 guard；
- 复合唯一约束正确。

### 22.3 RBAC and plans

- Permission/Menu 保持全局稳定；
- Role/Dept/Post 租户隔离；
- 相同 role code 可在不同租户存在；
- plan 禁用 module 后菜单和 API 同时不可用；
- plan 收缩后旧角色权限被安全裁剪；
- 部门 data scope 不突破 tenant boundary。

### 22.4 Runtime isolation

- Redis keys 带 tenant namespace；
- 文件 key 和下载鉴权带 tenant；
- BullMQ worker 恢复 tenant context；
- tenant Outbox 使用本租户 provider；
- OAuth callback 恢复正确 tenant；
- WebSocket 不跨 tenant 广播；
- audit/run logs 保存 tenant 快照。

### 22.5 Admin

- Tenants live-only；
- Tenant Plans live-only；
- Members live-only；
- Switcher live；
- 平台访问租户有醒目标识和审计；
- 无 fixture fallback；
- 权限按钮与 API 一致。

### 22.6 Delivery

- Prisma migration 和 seed 可重复；
- OpenAPI/SDK 无 drift；
- lint/typecheck/test 通过；
- focused tenant isolation smoke 通过；
- `pnpm deploy:opencore` 通过；
- API `39172`、Admin `39174`、local smoke `39173`；
- public API/Admin smoke 是真实请求；
- deploy guard 能检测 tenant bypass 和旧 bundle。

---

## 23. Mandatory Security Tests

最少准备：

```text
Tenant A
- User Alice
- Role admin
- Dept A
- Config key feature.x
- File A

Tenant B
- User Bob
- Role admin
- Dept B
- Config key feature.x
- File B
```

必须测试：

1. A、B 均可创建 `admin` role code。
2. A、B 均可创建相同 Dict/Config code。
3. Alice 看不到 Bob、Dept B、Config B、File B。
4. Alice 猜到 File B ID 也不能下载。
5. Alice 修改 Header 为 tenant B 不能越权。
6. Alice 不能把 Role B 分配给 Membership A。
7. 平台管理员必须有 `platform:tenant:visit` 才能进入 B。
8. 平台访问必须记录 actor、target tenant、reason、time。
9. tenant B 停用后，Bob 旧 token 失效。
10. tenant B job 不能读取 tenant A 数据。
11. tenant B Outbox 不能使用 tenant A provider secret。
12. cache prefix clear 只影响当前 tenant。
13. 当前页导出和后端导出只包含当前 tenant 数据。
14. 导入时不能通过外部 ID 关联其他 tenant。
15. root tenant migration 前后行数一致。

---

## 24. Files the Next AI Must Inspect First

OpenCore：

```text
docs/quality-cycle/cycle-021/handoff.md
docs/strategy/progress.md
docs/strategy/ruoyi-yudao-capability-matrix.md
packages/module-registry/src/registry.ts
packages/module-registry/src/modules.ts
prisma/schema.prisma
prisma/seed.ts
packages/core/src/request-context.ts
packages/core/src/request-context.middleware.ts
packages/database/src/prisma.service.ts
packages/security/src/security-auth/security-auth.service.ts
packages/security/src/security-auth/security-bearer-token.service.ts
packages/system/src/system-user/system-user.prisma-repository.ts
packages/system/src/system-role/system-role.prisma-repository.ts
packages/system/src/system-dept/system-dept.prisma-repository.ts
packages/system/src/system-post/system-post.prisma-repository.ts
packages/redis/src/key.ts
packages/file/src/file-key.ts
packages/scheduler/src/scheduler/scheduler.executor.ts
apps/admin/config/routes.ts
apps/admin/src/access.ts
apps/admin/scripts/smoke-test.ts
```

参考项目路径见第 4 节。

---

## 25. Recommended New Package and File Boundaries

建议新增：

```text
packages/tenancy/
  src/tenant-context.ts
  src/tenant-policy.ts
  src/tenant-resolver.ts
  src/tenant-prisma.ts
  src/tenant-cache-key.ts
  src/tenant-runtime.ts
  src/index.ts

apps/api/src/modules/core/tenant/
  tenant.controller.ts
  tenant.dto.ts
  tenant.service.ts
  tenant.repository.ts
  prisma-tenant.repository.ts
  tenant.module.ts

apps/admin/src/pages/System/Tenants.tsx
apps/admin/src/pages/System/TenantPlans.tsx
apps/admin/src/pages/System/TenantMembers.tsx
```

具体文件名可按现有项目约定调整，但必须保持：

- tenancy 基础能力不塞进 `monitor/operations`；
- 平台租户控制面和租户业务数据访问分层；
- contracts、SDK、API、Admin、module registry 同步演进。

---

## 26. First Execution Queue for the Next AI

后续 AI 第一轮不得直接修改几十张 Prisma 表。

### Round 1 — Docs-only

必须完成：

1. 阅读本 handoff 和 Cycle-021 source of truth；
2. 新建 `docs/quality-cycle/cycle-022/`；
3. 写入：
   - `handoff.md`；
   - `tenant-architecture.md`；
   - `acceptance-matrix.md`；
   - `backlog.md`；
   - `threat-model.md`；
4. 将本文件中的模型归属矩阵落入仓库；
5. 明确 Round 2 仅做 Tenant/Plan/Membership foundation；
6. docs format/check；
7. commit + push；
8. 不部署。

### Round 2 — Foundation only

只做：

- foundation Prisma models；
- root tenant seed；
- admin root membership；
- module registry entries；
- API read-only tenant summary；
- migration/backfill verification；
- tests。

不要在同一轮迁移全部 System Repository。

### Round 3 — Auth context

只做 tenant selection/switch/token/session/request context，以及完整安全测试。

后续按 T3-T6 顺序推进。

---

## 27. Explicit Non-Goals

Cycle-022 禁止顺带做：

- CRM、ERP、商城、支付；
- BPMN 完整工作流；
- AI/RAG/Agent；
- 报表设计器；
- 大数据异步导出中心；
- 租户计费、账单、自动续费；
- 一租户一数据库；
- 一租户一 PostgreSQL schema；
- 动态创建数据库；
- 全量 RLS 一次上线；
- OpenForge 自动写所有 tenant migration；
- 将所有表无差别增加 tenantId；
- 信任客户端 tenant header；
- 使用 `tenantId = 0` 作为未说明的平台语义；
- 一次性删除旧 RBAC 关系；
- 用 fixture 页面冒充租户产品完成。

---

## 28. Stop Conditions

Tenant Foundation 只有满足以下条件才可以宣布 V1 完成：

1. global User + multi-tenant membership 可用；
2. tenant-bound token 和 switch 可用；
3. 用户、角色、部门、岗位完成租户隔离；
4. Dict/Config/Notice/File 至少完成第一批隔离；
5. Redis/File/Queue tenant propagation 可验证；
6. 两租户交叉访问测试全部通过；
7. Tenant/Plan/Member Admin live-only；
8. public API/Admin smoke 通过；
9. deploy guard 可阻止 tenant bypass 回归；
10. docs、schema、SDK、OpenAPI 状态一致；
11. 工作树 clean，代码已 push；
12. 未将未准入大业务域混入本轮。

---

## 29. Final Instruction to the Receiving AI

用户已明确要求研究并开始规划 OpenCore 多租户能力，不需要再次询问是否要做多租户。

接手后应：

1. 先核对 `main` 最新代码是否改变了本文件依据；
2. 若有差异，更新事实，不改变已确定的核心架构方向，除非出现实质冲突；
3. 从 Round 1 docs-only 开始；
4. 将任务拆成有限、可部署、可回滚的阶段；
5. 每轮只关闭一个清晰隔离边界；
6. 任何发现的跨租户风险都必须转化为测试或 guard；
7. 不得以“租户页面已完成”宣称多租户完成；
8. 不得为了追求透明而隐藏 tenant ownership；
9. 不得用前端 Header 代替服务端成员校验；
10. 优先保证隔离正确，再扩展套餐、邀请、运营体验。

核心目标只有一句：

> **让 OpenCore 从成熟的单租户企业后台，安全地演进为支持共享 SaaS 部署的平台内核，并且不破坏单租户独立部署体验。**
