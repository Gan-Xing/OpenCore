# OpenCore Cycle-021 Capability Map Productization Handoff

Date: 2026-06-13
Repository: `Gan-Xing/OpenCore`
Default branch: `main`
Latest observed feature commit: `167bf08 feat(login-log): add login type result schema / 新增登录日志类型结果模型`
Latest deployed feature commit: `167bf08 feat(login-log): add login type result schema / 新增登录日志类型结果模型`
Latest deployed hardening commit: `4df5dd1 fix(system): satisfy xlsx export lint guard / 修复 XLSX 导出 lint 守卫`

## One-sentence Goal

基于已完成的 BE20 后端运行时包化闭环，启动 cycle-021 capability-map 产品化递归：由 AI 实时对比若依/芋道与 OpenCore，按最低依赖能力缺口逐轮补齐 API/SDK/Admin/权限/菜单/种子/OpenAPI/smoke-e2e，并在每个可验收功能后 commit & push，直到 OpenCore 成为可真实登录、可完整操作、可观测、可生成的现代 TS/NestJS monorepo 企业后台底座。

## Recurring Loop Contract

Use this contract for every follow-up round:

- Read this handoff first, then keep
  `productization-waterline-audit.md`, `backlog.md`, `reference-comparison.md`
  and the latest completion report aligned.
- Recompare RuoYi/Yudao/OpenCore before choosing the next capability, and keep
  each capability's productization waterline plus debt queue explicit.
- One round means one minimal deployable, verifiable and reversible product
  stage. It does not mean the product only receives a minimal final
  implementation; the same product can and should take multiple rounds until it
  reaches the admitted waterline.
- Sort work by lowest dependency and product foundation value, then fill the
  necessary API, SDK, Admin, permission/menu, seed, OpenAPI, smoke/e2e and docs
  surfaces for that stage.
- For every code change, run the required tests, commit, push, deploy through
  `pnpm deploy:opencore`, and verify the public URLs. Do not hand-pick ports.
- Fixed ports are API `39172`, Admin `39174` and local smoke `39173`.
- Repeated failures such as deserialization drift, `/api/api` login prefix
  handling, stale frontend bundles and session/token revocation must become
  code tests, smoke checks or deployment-script guards.
- Pure documentation-only updates still need format/check, commit and push, but
  do not require redeploying unchanged runtime artifacts.

## Current Project State Rechecked

OpenCore 当前已经不是 skeleton，也不是单纯规划文档。当前 README、handoff 索引、strategy progress、cycle-020 backlog 和 completion report 均显示：S0/S1、D1-D6、S2-S9、Runtime Integration R-1-R7、OpenForge V1、Quality Cycle 001、Admin Pro V6 migration、Backend Self-Loop BE20 均已完成。

BE20 已把若依/芋道主干后台能力按 OpenCore 的 TS/NestJS monorepo 边界转译为 package-owned runtime：

- `@opencore/common`: 后端通用常量、错误码、响应契约、分页、排序、bounded filters。
- `@opencore/core`: NestJS foundation、异常过滤、响应拦截、request context、OpenAPI helpers、安全 headers、结构化日志。
- `@opencore/database`: Prisma service/module、事务 helper、seed helper。
- `@opencore/redis`: Redis client、key naming、TTL/cache helpers、BullMQ connection options。
- `@opencore/file`: local/MinIO/S3 storage abstraction、安全 object key、文件输入校验。
- `@opencore/system`: dict、config、notice、dept、post、menu、role、user runtime。
- `@opencore/security`: auth、JWT/password/captcha、permission/role/data-scope guards。
- `@opencore/audit`: login log、operation log、audit decorator/interceptor。
- `@opencore/online-user`: online user/session runtime 和 kick-out audit context。
- `@opencore/scheduler`: scheduler definitions、run logs、BullMQ-oriented metadata、registry whitelist。
- `@opencore/monitor`: health、status、version、queue、cache/runtime diagnostics。
- `@opencore/generator-core`: OpenForge schema/config、planning、diff、rendering、VFS、safe apply、manifest、rollback、doctor core。
- `tools/generator`: OpenForge CLI wrapper，提供 status、doctor、gate、plan/diff/check/apply/manifest/rollback。
- `apps/api`: composition root only，只保留 bootstrap、HTTP entry aggregation、module aggregation、runtime config、OpenAPI export/check。

Admin 当前是 Umi Max + Ant Design Pro V6 + ProComponents v3 + antd 6 + React 19，已有 Dashboard、System、Security、Monitor、Tools、Collaboration、Optional、Integrations 页面和 smoke test。最新安全修复已移除 vulnerable `mockjs` / `@umijs/openapi` 依赖链，Admin `openapi` 脚本现在委托根目录 `openapi:export` + `sdk:check`，后续不得重新引入该依赖链。

## Current Cycle-021 Status

Cycle-021 已进入 capability-map productization recursion，并已完成这些
independently accepted stage loops. These entries are not all final
productization waterline completion; see
`docs/quality-cycle/cycle-021/productization-waterline-audit.md`:

- Round 1 `core.notice`
- Round 2 `core.dept`
- Round 3 `core.post`
- Round 4 `core.menu`
- Round 5 `core.role`
- Round 6 `core.permission`
- Round 7 `core.user`
- Round 8 `core.dict`
- Round 9 `core.config`
- Round 10 `core.file`
- Round 11 `core.login-log`
- Round 12 `core.audit-log`
- Round 13 `monitor.online-user`
- Round 14 `monitor.online-user` revocation stage 2
- Round 15 `core.file` content stage 2
- Round 16 `core.menu` tree metadata stage 2
- Round 17 `core.role` menu assignment stage 2
- Round 18 `core.role` user assignment stage 3
- Round 19 `core.user` security mutation stage 2
- Round 20 `core.role` status security stage 4
- Round 21 `core.dict` item-data simple-list stage 2
- Round 22 `core.user` post binding stage 3
- Round 23 `core.user` department tree filtering stage 4
- Round 24 `core.config` value-by-key and cache refresh stage 2
- Round 25 `core.post` simple-list option stage 2
- Round 26 `core.login-log` device/time filter stage 2
- Round 27 `core.dept` simple-list option stage 2
- Round 28 `core.user` self-profile basic info stage 5
- Round 29 `core.user` self-password stage 6
- Round 30 `core.user` simple-list option source stage 7
- Round 31 `core.user` profile avatar stage 8
- Round 32 `core.user` batch status/delete stage 9
- Round 33 `core.user` import template/CSV import stage 10
- Round 34 `core.user` import permission stage 11
- Round 35 `core.user` native XLSX export stage 12
- Round 36 `core.user` native XLSX import stage 13
- Round 37 `core.config` metadata enrichment stage 3
- Round 38 `core.config` native XLSX export stage 4
- Round 39 `core.config` batch deletion stage 5
- Round 40 `core.config` system deletion policy stage 6
- Round 41 `core.user` dedicated role assignment stage 14
- Round 42 `core.post` batch deletion stage 3
- Round 43 `core.dept` user-binding delete guard stage 3
- Round 44 `core.config` runtime Admin config stage 7
- Round 45 `core.login-log` login type/result schema stage 3

Round 9 还沉淀了固定端口本地 smoke/deploy 路径：
`pnpm smoke:api:local` 使用 `39173`，`pnpm deploy:opencore` 使用 API
`39172` 和 Admin `39174`。后续改完代码不要再手动挑 3000/3010；走脚本，端口
占用就修占用或显式覆盖。

Round 10 继续沉淀部署路径：`pnpm deploy:opencore` 会让 Admin 监听
`0.0.0.0:39174`，构建时默认使用检测到的服务器公网 API 地址，并在输出里打印
公网 Admin URL。当前服务器验证过的入口是 `http://144.217.243.161:39174`，
API 是 `http://144.217.243.161:39172`。

Round 11 修复并沉淀了前端登录 405 根因：Admin bundle 之前没有把
`ADMIN_API_BASE_URL` 编进浏览器产物，导致浏览器把 `POST /api/auth/login`
打到 `http://144.217.243.161:39174` 的静态服务器，静态服务器只收 GET/HEAD
所以返回 405。现在 `pnpm deploy:opencore` 会强制校验构建后的 JS 是否包含公网
API base URL，并且 Admin 静态服务器会把 `/api/*` 代理到部署 API；部署过程还会
通过 Admin 同源 `/api/auth/login` 做一次真实登录冒烟。

Round 12 修复并沉淀了前端登录 `/api/api` 根因：Admin SDK request helper
会自己给请求路径加 `/api`，所以 `ADMIN_API_BASE_URL` 必须是 API origin，
例如 `http://144.217.243.161:39172`，不能是
`http://144.217.243.161:39172/api`。现在 `pnpm deploy:opencore` 默认使用
origin，并会在配置值以 `/api` 或 `/api/` 结尾时直接失败，避免浏览器再次发出
`/api/api/auth/login`。

Round 13 产品化了 `monitor.online-user`：Admin 在线用户页面现在走 live SDK
service，可列表、详情、当前页导出并按 `monitor:online-user:manage` 强退会话；
固定 smoke 会强退 `session_operator`，同时验证 `session_admin` 仍保持 active。
本轮也继续沉淀部署路径：Admin 静态服务器会返回 no-store 的退役
`/service-worker.js` 清理旧 Workbox cache，并把旧标签页发出的 `/api/api/*`
代理请求归一化为 `/api/*`。`pnpm deploy:opencore` 会在启动后从公开 Admin URL
拉取登录 HTML、当前 `umi.*.js` 和退役 service worker，确认 bundle 包含 API
origin 且不包含重复 API 前缀。

Round 14 补齐了 Round 13 被审计为偏薄的核心问题：bearer token 现在带 token
ID，登录会注册 online-user session，鉴权会检查 session 是否已撤销或过期；Admin
支持选中多行批量强退并展示 browser/OS 字段。`pnpm deploy:opencore` 的
online-user smoke 已证明被批量强退的真实 token 再访问 `/api/auth/me` 返回 401；
公网验证也通过了同样链路。

Round 15 补齐了 Round 10 被审计为偏薄的文件中心问题：`core.file` 现在有认证
upload/download 内容闭环，上传通过 `FileStorageService` 写真实 bytes，下载从
storageKey 读回对象，Admin 文件中心支持选择文件上传和行级下载。固定 smoke 和公网
验证都证明上传内容可以原样下载。

Round 16 补齐了 Round 4 被审计为偏薄的菜单控制面问题：`core.menu` 现在持久化
parent tree、type、icon、component、status、cache、hidden 元数据，Admin Menus
从平铺表升级为树表和 parent `TreeSelect`，API/seed/repository 会阻止自引用、环
和删除仍有子节点的父菜单。固定 smoke 和公网验证都证明父子创建、删除保护以及
`parentKey: null` 清空语义可用。

Round 17 开始补齐 P1 `core.role`/`core.user` 队列：`core.role` 现在有角色菜单树
授权 API/SDK/Admin 闭环。后端将选中的 menu keys 转换成菜单绑定的 permission
codes，同时保留非菜单权限；API 保存后会撤销所有持有该角色用户的 active
online-user sessions，固定 smoke 和公网验证均证明旧 token 再访问 `/api/auth/me`
返回 401，重新登录后权限刷新生效。Admin Roles 页面新增行级 Menu Assignment 树
弹窗，部署 Admin chunk 已验证包含 `Menu Assignment`、`checkedMenuKeys` 和
`revokedSessionCount` 标记。

Round 18 继续补齐 `core.role`/`core.user` 队列：`core.role` 现在有角色用户分配
API/SDK/Admin 闭环。`GET/PATCH /api/core/roles/:code/users` 会读取和设置普通用户
与角色的关联，system users 不能通过该入口被修改；API 会只撤销角色关系发生变化的
用户 active sessions。固定 smoke 和公网验证均证明取消授权、重新授权都会让旧
token 变成 401，重新登录后 roleCodes/permissionCodes 刷新生效。Admin Roles 页面
新增行级 User Assignment `Transfer` 弹窗，部署 Admin chunk 已验证包含
`User Assignment`、`assignedUserIds` 和 `assignOpenCoreRoleUsers` 标记。

Round 19 继续补齐 `core.user` 队列：用户状态切换、重置密码、直接用户更新和用户删除
现在都有明确的 session invalidation 语义。`PATCH /api/core/users/:id/status` 会启用/
禁用普通用户，禁用后旧 token 立即 401 且登录被阻断；`POST
/api/core/users/:id/reset-password` 会更新密码并撤销该用户 active sessions；直接
`PATCH /api/core/users/:id` 和 `DELETE /api/core/users/:id` 也会撤销该用户 active
sessions。固定 smoke、部署 smoke 和公网 smoke 均证明 status/reset/update/delete 会让
旧 token 失效，并且 reset 后旧密码不能再登录。Admin Users 页面新增状态切换、重置密码
弹窗和 `Revoked sessions` 反馈，部署 Admin Users chunk 已验证包含 `Reset Password`
和 `Revoked sessions` 标记。部署过程中还把 online-user smoke 从固定 seed session
断言改为本次 admin token session 断言，避免真实服务器 active admin session 超过分页后
误报。

Round 20 关闭 `core.role` 当前基础水位的最后安全缺口：角色现在有 `enabled` 状态、
状态切换 API/SDK/Admin 闭环和严格 boolean 反序列化校验。禁用角色会让该角色不再出现在
登录返回的 `roleCodes`、权限聚合和数据范围计算里；状态切换、直接角色更新和角色删除都会
撤销受影响用户的 active online-user sessions。system role 不能被禁用，避免管理员锁死。
固定 smoke、部署 smoke 和公网 smoke 均证明 disable/enable/update/delete 会让旧 token 失效，
禁用期间重新登录不会带回该角色权限，启用后重新登录恢复。Admin Roles 页面新增状态筛选、
状态列、启用/禁用操作和 `Revoked sessions` 反馈，部署 Admin Roles chunk 已验证包含
`Disable this role`、`Enable this role`、`System roles cannot be disabled` 和
`Revoked sessions` 标记。

Round 21 关闭 `core.dict` 当前基础水位缺口：字典在 Round 8 的类型 CRUD 和嵌入式 items
基础上，新增了独立 item management API/SDK/Admin 闭环和 public consumer
`/api/core/dict-data/simple-list`。管理端可在 Dicts 行级 `Dictionary Items` 弹窗中新建、
编辑、删除数据项；simple-list 只返回 enabled dict type 下 enabled items，支持按
`dictCode` 过滤。固定 smoke、部署 smoke 和公网 smoke 均证明 item CRUD、错误 boolean
反序列化 400、disabled item 过滤、disabled dict type 过滤和公开 consumer endpoint 可用。
Admin Dicts chunk 已验证包含 `Dictionary Items`、`New Item`、`simple-list consumer endpoint`
和 item service markers。

Round 22 继续补齐 `core.user` 队列：用户管理现在持久化 user-post 关系，seeded admin
绑定 `admin` 岗位，用户 list/detail/create/update/export/OpenAPI/SDK 均返回或接受
`postCodes`。Admin Users 页面新增岗位列、详情标签、创建/编辑多选和导出列，岗位选项来自
live `core.post` 列表。固定 smoke、部署 smoke 和公网 smoke 均证明未知岗位 404、创建用户绑定
`engineer` 岗位、更新用户清空岗位，以及既有 status/reset/update/delete session
revocation 语义仍然有效。部署 Admin Users chunk 已验证包含 `Select posts` 和 `postCodes`
标记。

Round 23 继续补齐 `core.user` 队列：用户管理现在支持按部门树筛选用户。`GET
/api/core/users` 和 `GET /api/core/users/export` 接受 `deptId` 查询参数，后端按选中部门及其
子部门过滤，并对未知部门返回 404；SDK/OpenAPI/Admin 均同步该参数。Admin Users 页面新增左侧
Department scope 树和 All departments 入口，树数据来自 live `core.dept`。固定 smoke、部署
smoke 和公网 smoke 均证明未知部门 404、直接部门过滤、父部门子树过滤和无关部门排除可用；公网
Admin Users chunk 已验证包含 `Department scope`、`All departments` 和 `deptId` 标记。

Round 24 继续补齐 `core.config` 队列：系统配置现在新增运行时消费面和缓存控制面。`GET
/api/core/config/get-value-by-key?key=...` 只返回 `visibility=public` 的配置值，private/secret
配置不会泄露；`POST /api/core/config/refresh-cache` 按 `core:config:update` 保护并重建
service 内 public value cache。create/update/delete 会失效对应 key 的缓存。Admin Config 页面新增
`Refresh cache` 工具栏动作和 public 行级 `Read public value by key` 操作。固定 smoke、部署
smoke 和公网 smoke 均证明 value-by-key、更新后缓存失效、refresh-cache 和 secret value 403
阻断可用；公网 Admin Config chunk 已验证包含 `Refresh cache` 和 `Read public value by key`，
当前 main bundle 已验证包含 `get-value-by-key` 和 `refresh-cache`。

Round 25 继续补齐 `core.post` 队列：岗位管理现在新增 consumer option 源
`GET /api/core/posts/simple-list`。该接口返回 enabled posts 的轻量 `{ code, name, order }`
列表，作为用户表单岗位选择源，而不是让用户页继续读取岗位管理分页列表。API/SDK/OpenAPI、
seed/Prisma 仓储、Admin Users 和固定部署脚本均同步该闭环。新增 `tools/scripts/smoke-core-post.mjs`
并接入 `pnpm smoke:api:local` 与 `pnpm deploy:opencore`，固定 smoke、部署 smoke 和公网 smoke
均证明禁用岗位不会进入 simple-list、启用后会进入 simple-list、option shape 不暴露管理字段、
岗位 export/detail/delete 仍可用。公网 Admin Users chunk 已验证包含 `Select posts`，当前 main bundle
已验证包含 `/core/posts/simple-list`、API origin `http://144.217.243.161:39172` 且不包含
`/api/api/auth/login`；公网 Admin 代理 `/api/auth/login` 与兼容 `/api/api/auth/login` 均返回 201。

Round 26 继续补齐 `core.login-log` 队列：登录日志现在从记录的 user-agent 派生
`browser` 和 `os`，并支持服务端 `ip`、`createdFrom`、`createdTo` 筛选。UA 解析已沉到
`@opencore/common`，`monitor.online-user` 复用同一解析器。Admin Login Logs 页面新增
服务端 username/IP/result/time 筛选工具条，表格、详情和当前页导出展示 Browser/OS。固定
smoke、部署 smoke 和公网 smoke 均证明 Chrome/Windows 失败登录会被记录、设备字段可见、
IP/时间窗筛选可用、未来时间窗排除该行、非法 `createdFrom` 返回 400，导出列包含 device 字段。
公网 Admin 登录日志页返回 200；当前 main bundle 已验证包含 API origin 和 `/core/login-logs`，
登录日志 chunk 已验证包含 `createdFrom`、`createdTo`、`Browser`、`OS` 与 `Apply server filters`，
且 main bundle 不包含 `/api/api/auth/login`；公网 Admin 代理 `/api/auth/login` 与兼容
`/api/api/auth/login` 均返回 201。

Round 27 继续补齐 `core.dept` 队列：部门管理现在新增 consumer option 源
`GET /api/core/depts/simple-list`。该接口返回 enabled departments 的轻量
`{ id, name, parentId, order }` 列表，作为用户表单部门选择源，而不是让用户页继续依赖部门管理树
的完整载荷。API/SDK/OpenAPI、seed/Prisma 仓储、Admin Users 和固定部署脚本均同步该闭环。
新增 `tools/scripts/smoke-core-dept.mjs` 并接入 `pnpm smoke:api:local` 与
`pnpm deploy:opencore`，固定 smoke、部署 smoke 和公网 smoke 均证明禁用部门不会进入
simple-list、启用后会进入 simple-list、option shape 不暴露 `code`/`enabled`/`children`
等管理字段、部门 export/detail/delete 仍可用。公网 Admin Users 页返回 200；当前 main bundle
`umi.cf2e4e65.js` 已验证包含 `/core/depts/simple-list`、API origin
`http://144.217.243.161:39172` 且不包含 `/api/api/auth/login`；公网 Users chunk
`p__System__Users.b034bbd1.async.js` 已验证包含 `Select department`；公网 Admin 代理
`/api/auth/login`、兼容 `/api/api/auth/login` 以及 API origin `/api/api/auth/login`
均返回 201。

Round 28 继续补齐 `core.user` 队列：用户现在有认证态个人资料基础闭环。
`GET/PATCH /api/core/users/profile` 使用新的 auth-only guard，只要求 bearer 认证，
不再把 `/auth/me` 和个人资料读取耦合到 dashboard 权限；当前阶段只允许用户更新自己的
`displayName`，且 seeded/system admin 仍不能通过管理端 `PATCH /api/core/users/:id`
绕过系统用户保护。SDK/Admin/OpenAPI 和固定 smoke 均同步该闭环。Admin 新增隐藏路由
`/personal/profile` 和 Avatar 菜单入口，页面展示身份、部门、角色、岗位并可保存显示名。
固定 smoke、部署 smoke 和公网 smoke 均证明 profile 读取、更新、`/auth/me` 刷新、空
displayName 400、系统用户管理更新仍 400。公网 Profile 页返回 200；当前 main bundle
`umi.b3f9bcae.js` 已验证包含 `/core/users/profile`、API origin
`http://144.217.243.161:39172` 且不包含 `/api/api/auth/login`；公网 Profile chunk
`p__Personal__Profile.7e74b02d.async.js` 已验证包含 `Display name`、`Profile saved.`
和 `postCodes`；公网 Admin 代理 `/api/auth/login`、兼容 `/api/api/auth/login` 以及 API
origin `/api/api/auth/login` 均返回 201。

Round 29 继续补齐 `core.user` 队列：用户现在有认证态自助改密码闭环。
`PATCH /api/core/users/profile/password` 接受 `oldPassword/newPassword`，使用 auth-only
guard，校验旧密码，拒绝新旧相同，更新当前用户 password hash，并撤销该用户名的 active
online-user sessions。Admin `/personal/profile` 新增 `Change password` 表单，成功后清理
本地 token 并跳回登录页。SDK/OpenAPI、seed/Prisma 仓储、API 权限矩阵、Admin smoke 和
固定 core-user smoke 均同步该闭环。固定 smoke、部署 smoke 和公网 smoke 均证明错误旧密码
401、新旧相同 400、成功改密、旧 token 401、旧密码不能登录、新密码可以登录。公网 Profile
页返回 200；当前 main bundle `umi.4cacaf95.js` 已验证包含
`/core/users/profile/password`、API origin `http://144.217.243.161:39172` 且不包含
`/api/api/auth/login`；公网 Profile chunk `p__Personal__Profile.d2b0fdde.async.js` 已验证
包含 `Change password`、`Current password`、`New password`、`Confirm password`、
`Password changed`、`Sign in again`、`/user/login` 和 `/personal/profile`；公网 Admin
代理 `/api/auth/login`、兼容 `/api/api/auth/login` 以及 API origin `/api/api/auth/login`
均返回 201。

Round 30 继续补齐 `core.user` 队列：用户现在有认证态精简选项源。
`GET /api/core/users/simple-list` 使用 auth-only guard，不要求 `core:user:read`
管理权限，支持 `deptId` 子树过滤，只返回 enabled users 的轻量
`{ id, username, displayName, deptId, postCodes }`，不暴露 `roleCodes`、`enabled`
或 `system` 管理字段。SDK/OpenAPI、seed/Prisma 仓储、API 权限矩阵、Admin static
smoke 和固定 core-user smoke 均同步该闭环。Admin Roles 的 User Assignment
`Transfer` 弹窗现在消费 `listOpenCoreUserOptions()` 作为轻量用户标签源。固定 smoke、
部署 smoke 和公网 smoke 均证明未登录访问 401、未知部门 404、部门过滤、disabled
user 过滤、enabled user 回归以及 option shape 管理字段不泄露。公网 Roles 页返回 200；
当前 main bundle `umi.a7593895.js` 已验证包含 `/core/users/simple-list`、API origin
`http://144.217.243.161:39172` 且不包含 `/api/api/auth/login`；公网 Roles chunk
`p__System__Roles.978efe8a.async.js` 已验证包含 `User Assignment`、`Available users`
和 `Assigned users`；公网 Admin 代理 `/api/auth/login`、兼容 `/api/api/auth/login`
以及 API origin `/api/api/auth/login` 均返回 201。

Round 31 继续补齐 `core.user` 队列：用户现在有个人头像上传、公开预览、替换和删除闭环。
`POST /api/core/users/profile/avatar` 使用 auth-only guard，不要求 `core:user:update`
管理权限，接收 `originalName/mimeType/contentBase64`，只允许 PNG/JPEG/WebP/GIF，
校验 base64、大小和图片 magic bytes，并通过 `FileStorageService` 写真实对象；
`DELETE /api/core/users/profile/avatar` 清除当前用户头像并删除旧对象；公开只读
`GET /api/core/users/:id/avatar` 返回头像 bytes，供 Admin 顶栏和个人资料页直接预览。
用户 summary/profile/auth-me 返回 `avatarUrl` 和公开头像元数据，但不暴露 storage key。
SDK/OpenAPI、Prisma migration、seed/Prisma 仓储、API 权限矩阵、Admin static smoke
和固定 core-user smoke 均同步该闭环。Admin `/personal/profile` 新增上传和移除头像按钮，
并把 `avatarUrl` 同步到 ProLayout 使用的 `avatar` 字段。固定 smoke、部署 smoke 和公网
smoke 均证明未登录上传 401、非法 MIME/base64 400、上传后公网下载 bytes 与原文件一致、
`/auth/me` 返回头像 URL、删除后公开 URL 404。公网 Profile 页返回 200；当前 main bundle
`umi.04ac3a19.js` 已验证包含 API origin `http://144.217.243.161:39172` 且不包含
`/api/api/auth/login`；公网 Profile chunk `p__Personal__Profile.e34daa22.async.js`
已验证包含 `Upload avatar`、`Remove avatar`、`Avatar updated.`、`Avatar removed.`
和 `avatarUrl`；公网 Admin 同源 `/api` 上传后，使用 Admin 域名访问返回的 `avatarUrl`
可下载原始图片 bytes；公网 Admin 代理 `/api/auth/login`、兼容 `/api/api/auth/login`
以及 API origin `/api/api/auth/login` 均返回 201。

Round 32 继续补齐 `core.user` 队列：用户现在有批量启用/禁用和批量删除闭环。
参考 RuoYi 的 `DELETE /system/user/{userIds}`、`changeStatus` 与 Yudao 的
`/system/user/delete-list`、`update-status`，OpenCore 新增
`PATCH /api/core/users/batch/status` 和 `DELETE /api/core/users/batch`，分别复用
`core:user:update` 和 `core:user:delete` 权限。系统用户、空数组、重复 ID 和缺失用户
都在仓储层校验；Prisma 删除使用 transaction 清理 `userRole/userPost/user`；controller
统一按用户名撤销 active sessions。SDK/OpenAPI、API 权限矩阵、Admin Users 批量工具栏、
Admin static smoke 和固定 core-user smoke 均同步该闭环。Admin Users 表格现在禁选 system
用户，支持 `Enable selected`、`Disable selected` 和 `Delete selected`。固定 smoke、部署
smoke 和公网 smoke 均证明批量禁用会撤销两个临时用户 token 并阻止登录，批量启用后可重新
登录，批量删除会再次撤销 token 并阻止登录。当前 main bundle `umi.43e7d8e3.js` 已验证
包含 batch API path，公网 Users chunk `p__System__Users.9bc5aeb8.async.js` 已验证包含
批量 UI 文案；公网 Admin 代理 `/api/auth/login`、兼容 `/api/api/auth/login`、
API origin `/api/api/auth/login` 和 Admin 同源 batch guard 均通过。

Round 33 继续补齐 `core.user` 队列：用户现在有导入模板和 CSV 导入闭环。
参考 RuoYi 的 `/system/user/importTemplate`、`/system/user/importData` 与 Yudao 的
`/system/user/get-import-template`、`/system/user/import`、结构化
`createUsernames/updateUsernames/failureUsernames` 返回形状，OpenCore 新增
`GET /api/core/users/import-template` 和 `POST /api/core/users/import`。本阶段不新增
独立 `core:user:import` 权限，因为当前 registry 的用户权限仍是 CRUD+export；模板和导入
先按 `core:user:create` 保护，独立 import 权限如需产品化应单独走权限目录闭环。导入接受
base64 CSV，列为 `username/displayName/password/roleCodes/deptId/postCodes/enabled`；
空部门/岗位单元格表示不绑定，角色/岗位用分号分隔；文件级 base64、header、空文件走 400，
逐行业务错误进入 `failures`，其他行继续导入。`updateExisting` 严格要求 boolean；开启后
会更新已有普通用户并撤销这些用户名的 active sessions，系统用户仍由仓储保护。SDK/OpenAPI、
API 权限矩阵、Admin Users 下载模板/上传导入弹窗、Admin static smoke 和固定 core-user
smoke 均同步该闭环。固定 smoke、部署 smoke 和公网 smoke 均证明模板可读、非法
`updateExisting: "true"` 返回 400、部分成功返回创建/失败结果、更新已有用户撤销 token、
导入禁用用户从 simple-list 过滤。公网 Users chunk `p__System__Users.b1acfbc5.async.js`
已验证包含 `Download import template`、`Import users`、`Update existing users` 和
`Select CSV file`；当前 main bundle `umi.4dea9225.js` 已验证包含
`/core/users/import-template` 和 `/core/users/import`；公网 Admin 代理登录、兼容
`/api/api/auth/login`、API origin `/api/api/auth/login`、Admin 同源模板和导入 boolean
guard 均通过。注意：这轮关闭的是 CSV-compatible 导入模板/导入结果闭环，不等于用户
原生 XLSX/binary Excel 文件格式和服务端完整文件导出已经完成。

Round 34 继续补齐 `core.user` 队列：用户导入现在有独立权限闭环。参考
Yudao 当前 `UserController` 的 `@ss.hasPermission('system:user:import')` 导入保护，
并对照 RuoYi 用户导入独立于新增用户的产品动作，OpenCore 在 `PermissionAction` 中新增
`import` action，只给 `core.user` registry 注册 `core:user:import`，并通过 seed 自动进入
权限目录和 admin role。`GET /api/core/users/import-template` 与
`POST /api/core/users/import` 都从 `core:user:create` 切到 `core:user:import`；API 权限矩阵、
module-registry、contracts、SDK registry fixture、Admin access 和 Users 页面均同步。
Admin Users 使用 `canImportUsers` 控制下载模板和导入按钮，缺权限时显示
`Missing core:user:import`。固定 smoke、部署 smoke 和公网 smoke 均创建只有
`core:user:create` 而没有 `core:user:import` 的临时角色/用户，证明该 token 访问导入模板
和导入接口返回 403；admin token 仍可完成导入模板和导入链路。公网 Admin `umi.5add3ee4.js`
已验证包含 `core:user:import` 和导入 API path，Users chunk
`p__System__Users.1a00d4b1.async.js` 已验证包含导入 UI 与缺权限提示；公网 Admin 同源
`/api/core/permissions` 已验证能看到 `core:user:import`，同源导入模板、登录和兼容
`/api/api/auth/login` 均通过。注意：这轮关闭的是独立导入权限，不等于原生 XLSX/binary
Excel 导入导出深度已经完成。

Round 35 继续补齐 `core.user` 队列：用户导出现在返回原生 XLSX 文件 payload。
参考 RuoYi `SysUserController` 的 `@ss.hasPermi('system:user:export')`
`/export` + `ExcelUtil.exportExcel`，以及 Yudao `UserController`
`/export-excel` + `ExcelUtils.write`，OpenCore 保持现有 JSON API 边界，先在
`GET /api/core/users/export` 返回 `filename/contentType/contentBase64`，文件名为
`opencore-system-users.xlsx`，MIME 为
`application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`。Admin Users
新增按 `core:user:export` 控制的 `Download Excel` 按钮；SDK/OpenAPI/Admin static
smoke 和 `core.user` fixed/deploy/public smoke 均验证 XLSX zip header。为避免本轮
引入大依赖和 lockfile 噪音，XLSX 容器用现有 lock 中的 `fflate` 生成，同时新增
`tools/scripts/sync-prisma-client-instances.mjs` 并挂到 `pnpm prisma:generate`，把
Prisma 多 peer 实例生成物同步问题沉淀为脚本守卫。公网 Admin `umi.c69be9c1.js`
已验证包含 `core:user:export` 和 `/core/users/export`，Users chunk
`p__System__Users.375bc26e.async.js` 已验证包含 `Download Excel`、
`User Excel export downloaded` 与 `Missing core:user:export`；公网 Admin 同源
`/api/core/users/export?deptId=dept_operations` 已验证返回 XLSX payload。注意：
这轮关闭的是原生 XLSX 导出文件，不等于 XLSX 导入解析已完成。

Round 36 继续补齐 `core.user` 队列：用户导入现在支持原生 XLSX 文件解析。
参考 RuoYi 用户导入模板/导入和 Yudao `get-import-template`/`import` 的 Excel
文件工作流，OpenCore 将 `GET /api/core/users/import-template` 从 CSV 模板升级为
`opencore-system-users-import-template.xlsx`，MIME 为
`application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`，并在
`POST /api/core/users/import` 自动识别 XLSX zip payload 与旧 CSV payload。XLSX
解析支持 inline strings、shared strings、布尔和基础值单元格，仍复用现有用户
create/update、role/dept/post 校验、partial failures、strict `updateExisting`
boolean 和会话撤销边界。Admin Users 上传入口从 `Select CSV file` 升级为
`Select CSV/XLSX file`，固定 smoke 新增 `core.user.import.xlsx`，使用动态用户名
生成 XLSX 并真实导入，避免导入模板示例账号污染公网数据。公网 smoke 已在
`http://144.217.243.161:39172` 通过；公网 Admin Users chunk
`p__System__Users.241380ef.async.js` 已验证包含 CSV/XLSX 上传入口，Admin 同源
`/api/core/users/import-template` 已验证返回 `.xlsx` 和 `PK` zip header。注意：
这轮关闭的是用户 XLSX 导入文件格式，不等于 dedicated User-page role assignment
workflow、email/phone/social account 或更完整 Excel 样式/错误高亮已经完成。

Round 37 继续补齐 `core.config` 队列：系统配置现在补齐 RuoYi/Yudao 都具备的
operator-facing metadata。参考 Yudao `ConfigSaveReqVO`/`ConfigRespVO` 的
`category/name/remark` 形状和 RuoYi 配置管理里的配置名称、分组/类型、备注式说明，
OpenCore 在 `SystemConfig` 持久化 `category`、必填 `name` 和可选 `remark`，并为既有数据
回填 `category='system'`、`name=key`。API/DTO/repository/seed/Prisma migration、SDK
types、registry fixtures、Admin Config 表格/详情/新建/编辑/筛选、OpenAPI 和 smoke 均同步。
固定 smoke、部署 smoke 和公网 smoke 已验证 create/detail/update/export 都返回
`category/name/remark`，并继续证明 secret value 仍被 redacted、public
`get-value-by-key` 与 cache refresh 仍可用。公网 Admin Config chunk
`p__System__Config.a971fcdf.async.js` 已验证包含 `Category`、`Name`、`Remark`、
`Refresh cache` 和 `Read public value by key`；公网 Admin 同源
`/api/core/config?page=1&pageSize=10` 已验证返回 seeded
`opencore.admin.title` 的 `category='system'`、`name='Admin title'` 和 remark。
注意：这轮关闭的是配置元数据水位，不等于批量删除、Excel 文件导出或更广泛 runtime
feature-flag propagation 已完成。

Round 38 继续补齐 `core.config` 队列：配置导出现在返回原生 XLSX 文件 payload。
参考 Yudao `ConfigController` 的 `/infra/config/export-excel` +
`infra:config:export` + `ExcelUtils.write`，以及 RuoYi 配置导出同类产品形状，OpenCore
保持现有 JSON API 边界，在 `GET /api/core/config/export` 返回
`opencore-system-config.xlsx` 的 `contentType/contentBase64`。导出列包含
`category/name/key/value/valueType/visibility/public/description/remark`，其中 secret
配置继续通过 repository redaction 输出 `[REDACTED]`，不泄露真实值。后端抽取
`packages/system/src/export-xlsx.ts` 作为系统包 workbook helper，用户 XLSX 导出和配置
XLSX 导出共用同一实现；Admin Config 新增按 `core:config:export` 控制的
`Download Excel` 按钮，并抽取 shared base64 下载 helper。固定 smoke、部署 smoke 和公网
smoke 均验证 `core.config.export.xlsx`；公网 Admin Config chunk
`p__System__Config.911ece50.async.js` 已验证包含 `Download Excel`、`Config Excel export
downloaded` 和 `Missing core:config:export`，Admin 同源
`/api/core/config/export?page=1&pageSize=100` 已验证返回 XLSX `PK` zip header。注意：
这轮关闭的是配置 Excel 文件导出，不等于批量删除、secret vault/KMS 或更广泛 runtime
feature-flag propagation 已完成。

Round 39 继续补齐 `core.config` 队列：系统配置现在对齐 Yudao
`/infra/config/delete-list` 的批量删除操作水位。OpenCore 新增
`DELETE /api/core/config/batch`，沿用 `core:config:delete` 权限，输入
`{ keys: string[] }` 并严格校验空数组、非字符串、空 key、重复 key 和缺失 key。
API/DTO/repository/service/SDK/OpenAPI/Admin Config 均同步；Admin Config 新增表格
row selection 和 `Delete selected` 批量删除动作。service 会在批量删除成功后逐 key
失效 public value cache，避免已缓存配置值继续可读。固定 smoke、部署 smoke 和公网
smoke 均验证 `core.config.batch-delete.*` 守卫与成功路径；公网 Admin Config chunk
`p__System__Config.8795ee37.async.js` 已验证包含 `Delete selected`、`rowSelection`
和 `Selected configs deleted`，公网 Admin main bundle `umi.257e0bb2.js` 已验证包含
`/core/config/batch`，Admin 同源 `/api/core/config/batch` 已通过真实创建、批量删除和
404 确认。注意：这轮关闭的是配置批量删除，不等于内置配置不可删字段、secret
vault/KMS 或更广泛 runtime feature-flag propagation 已完成。

Round 40 继续补齐 `core.config` 队列：系统配置现在补齐 Yudao
`ConfigTypeEnum.SYSTEM/CUSTOM` 的内置配置删除保护语义。OpenCore 在
`SystemConfig` 持久化 `system` 标识，seed 和 migration 将
`opencore.admin.title`、`auth.login.lockoutMinutes` 标记为内置系统配置；新建配置
默认 `system=false`。seed/Prisma repository 均会阻止单删和批量删除任何
`system=true` 配置，并在批量请求中先校验后变更，避免部分删除。API/DTO/OpenAPI/SDK/
fixtures/Admin Config 均同步 `system` 字段；Admin Config 增加 System 列、筛选、详情和
导出列，并禁用系统项行级删除与复选框，只允许批量删除 custom 配置。固定 smoke、部署
smoke 和公网 smoke 均验证 `core.config.system-flag`、
`core.config.system-delete-guard` 和
`core.config.batch-delete.system-guard`；公网 Admin Config chunk
`p__System__Config.c06f078e.async.js` 已验证包含
`System built-in configs cannot be deleted`、`getCheckboxProps`、`selected custom
config(s)?` 和 `dataIndex:"system"`，公网 Admin main bundle `umi.d3cc4418.js` 已验证
指向 API `http://144.217.243.161:39172` 且不含 `/api/api`，公网 Admin
`/api/auth/login` 与公网 API 登录均通过。注意：这轮关闭的是内置配置不可删策略，不等于
secret vault/KMS 或更广泛 runtime feature-flag propagation 已完成。

Round 41 回到 `core.user` 队列，补齐专用用户侧角色分配闭环。参考 Yudao
`GET /system/permission/list-user-roles` 和
`POST /system/permission/assign-user-role` 及 Admin 用户列表里的“分配角色”弹窗，
OpenCore 新增 `GET/PATCH /api/core/users/:id/roles`，使用
`core:user:manage` 权限并放在动态 `users/:id` 路由之前。seed/Prisma repository
均复用角色校验，拒绝重复角色、缺失角色和 system user 修改；角色关系变化会撤销该用户
active online-user sessions，重新登录后 roleCodes 刷新。SDK、OpenAPI、权限矩阵、
registry、Admin access 和 Admin Users 页面同步；Users 页面新增 `Assign Roles`
弹窗、缺权提示 `Missing core:user:manage` 和 system user 禁用状态。固定 smoke、部署
smoke 和公网 smoke 均验证 `core.user.role-assignment.*`，包括权限守卫、system user
guard、duplicate/missing role guard、clear/restore 以及旧 token 401；公网 Admin
`p__System__Users.9f27a9ab.async.js` 已验证包含 `Assign Roles`、
`Missing core:user:manage`、`System users cannot be assigned roles` 和
`Roles assigned.`，公网 main bundle `umi.a0a7b9b5.js` 已验证指向 API
`http://144.217.243.161:39172` 且不含重复 API 前缀，公网 Admin 同源登录与公网 API
登录均通过。注意：这轮关闭的是准入的用户侧角色分配水位，不等于邮箱/手机号/社交账号等未准入
用户资料扩展已完成。

Round 42 回到 `core.post` 队列，补齐岗位批量删除闭环。参考 Yudao
`DELETE /system/post/delete-list` 与 Admin 岗位表格的批量删除按钮，OpenCore 新增
`DELETE /api/core/posts/batch`，沿用 `core:post:delete` 权限并放在动态
`posts/:code` 路由之前。seed/Prisma repository 均复用岗位 code 规范化，拒绝空数组、
重复 code 和缺失 code，并在任何删除前完成全量校验，避免部分删除。SDK、OpenAPI、
权限矩阵、Admin platform service 和 Admin Posts 页面同步；Posts 页面新增
`rowSelection`、`Delete selected` 和批量成功反馈。固定 smoke、部署 smoke 和公网
smoke 均验证 `core.post.batch-delete.*`，包括 empty/duplicate/missing guards、真实两条
临时岗位批量删除、详情 404 和 simple-list 清理；公网 Admin
`p__System__Posts.f86b24a4.async.js` 已验证包含 `Delete selected`、
`Selected posts deleted` 和 `rowSelection`，公网 Admin 同源代理真实创建两条岗位并通过
`/api/core/posts/batch` 删除成功。注意：这轮关闭的是岗位批量删除，不等于有序列表/拖拽排序
等未准入岗位排序增强已完成。

Round 43 回到 `core.dept` 队列，补齐部门删除时的用户绑定保护闭环。OpenCore 的 Prisma
关系在用户绑定部门被删除时原本会 `onDelete: SetNull`，这会让 leaf department 删除绕过真实
组织约束并静默清空用户 `deptId`。本轮在 seed/Prisma repository 删除路径加入 assigned-user
preflight：仍先阻止有子部门的删除，再阻止任何仍绑定用户的部门删除；失败返回 400 且用户
`deptId` 保持不变。Admin Departments 删除动作现在会展示
`Departments with assigned users cannot be deleted` 兜底文案；固定 smoke、部署 smoke 和公网
smoke 均验证 `core.dept.delete.assigned-user-guard` 与
`core.dept.delete.assigned-user-preserved`。公网 Admin
`p__System__Departments.f85a1a09.async.js` 已验证包含删除保护文案，公网 Admin 同源
`/api/auth/login` 和兼容 `/api/api/auth/login` 均通过，并通过 Admin 代理真实创建部门和绑定用户后
证明删除返回 400 且用户部门绑定仍保留。注意：这轮关闭的是用户绑定删除保护，不等于 data-scope
工作流 UI、批量部门删除或树排序/拖拽已经完成。

Round 44 继续补齐 `core.config` 队列，开启运行时配置传播闭环。参考 Yudao/RuoYi 配置中心作为
运行时可消费参数源的产品定位，OpenCore 新增公开只读
`GET /api/core/config/runtime`，从现有 public config cache 中读取
`opencore.admin.title` 并返回 `{ adminTitle }`；SDK 暴露无 token
`getConfigRuntime()`；Admin `getInitialState` 和登录页标题使用该 runtime title，避免前端继续只靠
硬编码 `OpenCore Admin`。固定 smoke、部署 smoke 和公网 smoke 均验证
`core.config.runtime` 与 `core.config.runtime-cache-invalidation`：更新
`opencore.admin.title` 后，runtime endpoint 立即返回新标题，随后恢复原值。公网 Admin
`umi.19450df1.js` 已验证包含 `/core/config/runtime`、API origin
`http://144.217.243.161:39172` 且不包含 `/api/api/auth/login`；公网 Admin 同源
`/api/core/config/runtime` 无 token 可读，同源 PATCH 标题后公网 API/Admin runtime 都读到新值并已恢复。
注意：这轮关闭的是 Admin title 的第一条 runtime propagation，不等于 secret vault/KMS、
多环境 runtime feature flags 或更广泛配置热传播边界已经完成。

Round 45 回到 `core.login-log` 队列，补齐登录类型/结果模型闭环。参考 Yudao 的
`logType/result` 枚举和 Admin 字典展示，以及 RuoYi 的登录状态、地点、浏览器/OS、
删除/清空/解锁操作面，OpenCore 本轮只承认最低依赖的 schema 扩展：新增持久化
`LoginLog.logType/result`，用可读字符串枚举表示 `login.username`、
`bad_credentials`、`user_disabled` 等结果；保留 legacy `success` 布尔兼容现有调用。
登录流程现在区分缺用户/错密码为 `bad_credentials`、禁用用户为
`user_disabled`，但外部仍统一返回 401，避免泄露账号状态。API/DTO/OpenAPI/SDK/Admin
均支持 `logType/result` 字段和服务端筛选；Admin Login Logs 页面展示 Login Type 与
Result，固定 smoke、部署 smoke 和公网 smoke 均验证 `core.login-log.result-schema`、
`core.login-log.invalid-result-guard`、导出列和详情字段。公网 Admin
`umi.63f63e69.js` 已验证包含 API origin 且不含重复 `/api/api/auth/login`；
`p__Security__LoginLogs.1e1a0df4.async.js` 已验证包含类型/结果 UI 标记；公网 Admin
同源代理按 `logType=login.username&result=bad_credentials` 查到真实失败登录，并验证详情、
导出列和非法 result 400。支持提交 `4df5dd1` 还将 XLSX helper 的正则改为显式字符过滤，
让全仓 lint gate 通过。注意：这轮关闭的是 login-log type/result schema expansion，不等于
IP location enrichment、日志删除/清空、用户解锁或 lockout policy 调优已经完成。

Post Round 13 re-audit corrected the meaning of "minimal loop": one round is a
minimal deployable, testable and reversible stage, not a minimal final product.
The productization waterline now classifies:

- Meets current waterline: Round 6 `core.permission`, Round 12
  `core.audit-log`, Round 13/14 `monitor.online-user`, Round 10/15
  `core.file`, Round 4/16 `core.menu`, Round 5/17/18/20 `core.role`,
  Round 8/21 `core.dict`,
  Round 7/19/22/23/28/29/30/31/32/33/34/35/36/41 `core.user`.
- First loop, enhance: Round 1 `core.notice`, Round 2/27/43 `core.dept`,
  Round 3/22/25/42 `core.post`, Round 9/24/37/38/39/40/44 `core.config`,
  Round 11/26/45 `core.login-log`.
- Thin, rework: none after Round 16.

The P0 remediation queue from the post-Round 13 re-audit is now clear. The next
round should continue with the P1 enhancement queue unless a new waterline audit
finds another blocker:

1. `core.config`: Round 24 closed public get-value-by-key plus cache
   refresh/invalidation; Round 37 closed category/name/remark metadata across
   API/SDK/Admin/smoke; Round 38 closed native XLSX export payload plus Admin
   download and smoke guards; Round 39 closed batch deletion with cache
   invalidation and Admin selected-row deletion; Round 40 closed persisted
   system/custom config deletion policy with API/Admin/smoke guards; Round 44
   closed the first runtime propagation loop by letting Admin read
   `opencore.admin.title` through public runtime config. Remaining work is
   broader runtime propagation boundaries and any admitted secret vault/KMS
   integration.
2. `core.login-log`: Round 26 closed browser/OS parsing and server-side IP/time
   filters. Round 45 closed persisted login type/result schema, Admin display
   and result/logType filters. Remaining work is IP/location enrichment where
   feasible plus cleanup/unlock policy integration.
3. `core.dept`: Round 27 closed the enabled-department simple-list option
   source consumed by Admin Users; Round 43 closed user-bound department
   deletion protection and preserved user `deptId` on failed delete. Remaining
   work is data-scope workflow integration and ordered tree operations where
   useful.
4. `core.post`: Round 25 closed the enabled-post simple-list option source;
   Round 42 closed batch deletion with Admin selected-row deletion and strict
   batch guards. Remaining work is ordered list operations where useful.
5. `core.notice`: read/unread state, inbox/header badge and delivery adapter
   design remain below full notice-product depth.

Commit `f4569a4` also fixed the remaining stale-login failure at API level:
`@opencore/core` now normalizes duplicate global prefixes before Nest route
matching, and `pnpm deploy:opencore` smokes
`POST /api/api/auth/login` directly against the API. Do not remove this guard.

Admin 生产构建已默认强制稳定 webpack 路径。不要为 OpenCore deploy 打开
`FORCE_UTOOPACK`；utoopack 已多次在 `global.less.css` CSS loader
deserialization 上失败。webpack 构建同时保留 `esbuildMinifyIIFE: true`，避免
Umi `esbuildHelperChecker` helper-name 冲突。

当前默认前端登录入口：`http://144.217.243.161:39174/user/login`。如果浏览器
仍显示旧的 `/api/api/auth/login`，用
`http://144.217.243.161:39174/user/login?v=basefix` 打开以避开旧标签页缓存。
当前本地部署
账号为 `admin`，密码来自 `.env.opencore.local` 的
`BOOTSTRAP_ADMIN_PASSWORD`；不要再把 `admin123` 当作这台服务器的有效密码。

## Resolved State Alignment

文档和 ledger 曾记录 cycle-020 / BE20 完成，但 `.opencore/quality-cycle/state.json`
仍显示：

```json
{
  "maxCycles": 20,
  "completedCycles": 19,
  "activeCycle": 20,
  "deadlineLondon": "2026-06-11 05:30:00 Europe/London"
}
```

`docs/quality-cycle/ledger.md` 已有：

```txt
2026-06-12 08:46:02 UTC documented cycle-020 completion; checked=24 backend modules; goalDuration=5h52m55s
```

Round 1 已处理这个状态对齐点，将 state 对齐到 cycle-021 active 状态。后续不应
再把这个 mismatch 当作阻塞项。

不要继续使用 `docs/quality-cycle/opencore-backend-self-loop.md` 作为主执行 prompt；
BE20 已完成，当前主线是 cycle-021 capability-map productization recursion。

## What The Next AI Should Do

下一轮不是固定任务清单，而是能力地图差距递归。AI 必须实时查询当前 OpenCore、若依、芋道和相关旧项目，自己判断当前最低依赖、最高价值、最小可闭环的产品化缺口。当前在打开新产品面之前，必须先按 `productization-waterline-audit.md` 的 P0 欠账队列补齐薄弱轮次。

### Mandatory first read

- `README.md`
- `docs/handoff/README.md`
- `docs/modules/priority-roadmap.md`
- `docs/strategy/progress.md`
- `.opencore/quality-cycle/state.json`
- `docs/quality-cycle/ledger.md`
- `docs/quality-cycle/cycle-020/backlog.md`
- `docs/quality-cycle/cycle-020/completion-report.md`
- `package.json`
- `apps/admin/package.json`
- `apps/api/src/app/app.module.ts`
- `packages/module-registry`
- `packages/contracts`
- `packages/sdk`
- `tools/generator`
- `prisma/schema.prisma`
- `docs/quality-cycle/cycle-021/productization-waterline-audit.md`

### Mandatory reference comparison

实时对比参考仓库，但不要复制代码：

- 若依 / RuoYi：能力地图、系统/监控/工具/代码生成、权限粒度、菜单组织。
- 芋道 / Yudao：Lite/Full 分层、system/infra/monitor/workflow/report/pay/mall/member/CRM/ERP/MES/WMS/AI/integration 能力地图。
- OpenCore 当前实现：module-registry、OpenAPI、SDK、Admin routes/access、Prisma seed、tests、smoke/e2e。

## Self-loop Protocol

每一轮只做一个最小端到端产品化闭环，不要一次写一堆大模块；但不要把
"最小闭环"降级理解成"产品只做最小实现"。同一产品可以连续多个阶段补齐到产品化水位。

循环如下：

1. 审计当前 OpenCore 状态和参考仓库能力地图。
2. 找到当前最低依赖、最高价值、最小可闭环的能力缺口。
3. 写入本轮 backlog/audit/reference-comparison。
4. 实现完整闭环：
   - package runtime 或 API aggregation，按当前架构边界选择。
   - Prisma schema / migration / seed，如适用。
   - Controller / Service / Repository / DTO。
   - Permission code / menu / module-registry / OpenAPI tag。
   - OpenAPI export/check。
   - SDK types/client/fixtures/tests。
   - Admin route/access/menu/page/action/detail/export/smoke。
   - unit/integration/smoke/e2e。
   - docs/handoff/progress/implementation-notes/completion-report。
5. 运行 focused tests。
6. 运行 full gate。
7. 每次改代码后必须走固定脚本：
   - 本地 API smoke 使用 `pnpm smoke:api:local`，固定端口 `39173`。
   - 部署使用 `pnpm deploy:opencore`，固定 API `39172`、Admin `39174`。
   - 不再手工判断或改用 3000/3010。
   - 部署后必须用公开 URL 验证 API 和 Admin，尤其是登录、前端 bundle、
     `/api/api` 重复前缀、前端缓存、session/token 失效等历史问题。
8. 每完成一个可独立验收功能，必须使用 commit and push skill：
   - 查看 git status / diff。
   - 运行相关测试。
   - commit message 必须含英文 + 中文摘要。
   - push 到远端。
   - 在 implementation notes/progress 中记录 commit hash。
9. 回到第 1 步，继续下一轮差距审计。

## Preferred Cycle-021 Theme

不要预设具体任务，但从当前状态看，cycle-021 最适合进入“产品化闭环 hardening”，优先审计这些方向：

- 真实登录后，Admin 是否能完整操作 System/Security/Monitor/Tools/Collaboration/Optional/Integrations。
- SDK/OpenAPI/Admin routes/access/module-registry 是否完全无 drift。
- 种子数据是否覆盖真实演示路径，不只是单元测试数据。
- smoke/e2e 是否覆盖登录、菜单、权限、列表、详情、导出、状态变更、错误/403/401。
- 已准入 collaboration / operations / integration design-only 能力是否需要进一步 hardening。
- OpenForge 是否继续保持 safe generator，不越权生成 Prisma schema/migration/business logic。

## Scope Guards

不得直接实现或偷偷扩大这些能力：

- CRM、ERP、MES、WMS、商城、会员、行业业务包。
- 多租户生产闭环。
- 真实支付、支付回调、退款、对账。
- BPMN/Flowable 风格完整工作流平台。
- 完整报表设计器、大数据异步导出生产执行。
- 知识库、RAG、Agent、AI workflow execution。
- 无白名单动态反射调度。
- OpenForge 写 Prisma schema / migration / business logic。
- 重新引入 vulnerable `mockjs` / `@umijs/openapi` 依赖链。

这些能力只能进入 backlog、design-only 或独立准入评估。

## Required Gates

根据改动范围运行 focused gates；每个可验收闭环完成前至少运行：

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm prisma:validate
pnpm openapi:export
pnpm openapi:registry-tags:check
pnpm openapi:check
pnpm registry:admin-routes:check
pnpm test:api
pnpm test:admin
NX_DAEMON=false pnpm nx test contracts
NX_DAEMON=false pnpm nx test module-registry
NX_DAEMON=false pnpm nx test sdk
```

涉及 OpenForge 时额外运行：

```bash
pnpm openforge:status
pnpm openforge:check
pnpm openforge:doctor
pnpm openforge:gate
pnpm openforge:test
NX_DAEMON=false pnpm nx test openforge
NX_DAEMON=false pnpm nx build openforge
```

失败必须修复，不能跳过、不能删除测试、不能用 mock 假完成。

## Stop Conditions

只有以下情况允许暂停：

1. 当前选择的能力缺口完成端到端闭环、测试通过、已 commit & push，并且 handoff/progress 已更新。
2. 遇到外部密钥、数据库权限、CI 权限或破坏性冲突，无法继续自动修复。
3. 发现当前需求会违反 scope guards，需要转为 design-only 或 backlog。

暂停时必须输出：

```txt
本轮能力：
完成内容：
涉及文件：
测试结果：
commit hash：
push 结果：
若依/芋道参考点：
OpenCore TS/NestJS 取舍：
剩余风险：
下一轮建议：
```
