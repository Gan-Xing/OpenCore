# OpenCore Cycle-021 Capability Map Productization Handoff

Date: 2026-06-12  
Repository: `Gan-Xing/OpenCore`  
Default branch: `main`  
Latest observed feature commit: `7db10fe feat(core-user): add self-profile loop / 新增个人资料闭环`
Latest deployed feature commit: `7db10fe feat(core-user): add self-profile loop / 新增个人资料闭环`
Latest deployed hardening commit: `04e446c fix(online-user): stabilize admin session smoke / 稳定在线用户管理员会话冒烟`

## One-sentence Goal

基于已完成的 BE20 后端运行时包化闭环，启动 cycle-021 capability-map 产品化递归：由 AI 实时对比若依/芋道与 OpenCore，按最低依赖能力缺口逐轮补齐 API/SDK/Admin/权限/菜单/种子/OpenAPI/smoke-e2e，并在每个可验收功能后 commit & push，直到 OpenCore 成为可真实登录、可完整操作、可观测、可生成的现代 TS/NestJS monorepo 企业后台底座。

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

Post Round 13 re-audit corrected the meaning of "minimal loop": one round is a
minimal deployable, testable and reversible stage, not a minimal final product.
The productization waterline now classifies:

- Meets current waterline: Round 6 `core.permission`, Round 12
  `core.audit-log`, Round 13/14 `monitor.online-user`, Round 10/15
  `core.file`, Round 4/16 `core.menu`, Round 5/17/18/20 `core.role`,
  Round 8/21 `core.dict`.
- First loop, enhance: Round 1 `core.notice`, Round 2/27 `core.dept`, Round
  3/22/25 `core.post`, Round 7/19/22/23/28 `core.user`, Round 9/24
  `core.config`, Round 11/26 `core.login-log`.
- Thin, rework: none after Round 16.

The P0 remediation queue from the post-Round 13 re-audit is now clear. The next
round should continue with the P1 enhancement queue unless a new waterline audit
finds another blocker:

1. `core.user`: Round 19 closed user status/reset-password and direct
   user-mutation session semantics; Round 22 closed user-post binding; Round
   23 closed department side-tree filtering; Round 28 closed authenticated
   self-profile basic display-name read/update. Remaining work is avatar,
   self-password, import/export and broader option/batch workflows.
2. `core.config`: Round 24 closed public get-value-by-key plus cache
   refresh/invalidation. Remaining work is category/name/remark enrichment,
   batch/file export depth and broader runtime propagation boundaries.
3. `core.login-log`: Round 26 closed browser/OS parsing and server-side IP/time
   filters. Remaining work is IP/location enrichment where feasible,
   cleanup/unlock policy integration and login-type/result expansion.
4. `core.dept`: Round 27 closed the enabled-department simple-list option
   source consumed by Admin Users. Remaining work is user binding path
   hardening, data-scope workflow integration and ordered tree operations where
   useful.
5. `core.post`: Round 25 closed the enabled-post simple-list option source.
   Remaining work is batch operations and ordered list operations where useful.

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
