# OpenCore Quality Cycle 001 Backlog

建议路径：`docs/quality-cycle/cycle-001/backlog.md`  
Cycle：001  
范围：阶段 1-6  
计数规则：本文件全部 checkbox 完成，并通过全仓 gate 后，运行计数脚本才允许 cycle +1。  
参考项目：OpenCore、NestWeb、Antdpro6、RuoYi/ruoyi-vue-pro、Yudao/yudao-ui-admin-vue3。

---

## A. Cycle 001 审计要求

- [x] Q001-AUDIT-001：审计 OpenCore 当前 README、docs、progress、roadmap、API、Admin、contracts、sdk、module-registry、OpenForge、runtime 状态，写入 `docs/quality-cycle/cycle-001/audit.md`。
- [x] Q001-AUDIT-002：审计 NestWeb：permission model、permissions、menus、messages、approval-requests、queue、system-log、openapi、prisma schema，写入 `reference-comparison.md`。
- [x] Q001-AUDIT-003：审计 Antdpro6：access、routes、TableExportButton、MessageCenter、Approvals、Auth/System/Security 页面、services、e2e，写入 `reference-comparison.md`。
- [x] Q001-AUDIT-004：审计 RuoYi/ruoyi-vue-pro 能力地图：system、infra、monitor、tool、codegen、workflow、report、job、notice、mail、sms、oauth、pay、member、mall、crm、erp、mes、wms。
- [x] Q001-AUDIT-005：审计 Yudao/yudao-ui-admin-vue3 前端模块地图：system、infra、bpm、report、mall、member、crm、erp、iot、ai、codegen。
- [x] Q001-AUDIT-006：输出本 cycle 的实施顺序，不允许先做 P4/P5 业务包，不允许跳过 OpenForge 和 contract gate。

---

## 1. 平台内核 Backlog

- [x] Q001-P1-RBAC-CRUD：检查并补齐 RBAC API 是否仅有 list。若 user/role/permission/menu 缺 create/update/delete/export，则按 OpenCore 权限码和 Prisma repository 补齐，Admin 与 SDK 同步，测试覆盖正反例。
- [x] Q001-P1-RBAC-MATRIX：新增或强化权限矩阵测试，覆盖无 token、无权限、禁用用户、错误权限码、危险操作权限。
- [x] Q001-P1-AUTH-SESSION：审计 auth token、过期、错误码、禁用用户失效、login log 记录；缺失则补齐最小生产可用行为和测试。
- [x] Q001-P1-AUDIT-INTERCEPTOR：检查 audit log 是否由真实 interceptor/guard 自动写入所有写接口；若只是手动 seed 或 repository 写入，补齐 request id、actor、method、path、statusCode、metadata 脱敏。
- [x] Q001-P1-CONFIG-SECRET：检查 system config 是否能区分 public/private/secret；确保 secret 不通过 API/Admin/export 泄漏；增加脱敏测试。
- [x] Q001-P1-FILE-STORAGE：检查 file asset 是否与 MinIO/S3 bucket/prefix、checksum、storageKey 对齐；补齐 metadata update/delete/export 行为和测试。
- [x] Q001-P1-MONITOR-PROBES：强化 monitor status 对 DB/Redis/BullMQ/S3 的 timeout、降级、错误脱敏；Admin Monitor 页面增加 smoke。
- [x] Q001-P1-OBSERVABILITY：补齐 request id / trace id 在 error、audit、log、response header 中的一致性测试。

---

## 2. 契约体系 Backlog

- [x] Q001-P2-SDK-GENERATE：检查 `OPENAPI_CONTRACT_PROTOCOL` 中 sdkGenerateCommand 与 root scripts 是否一致；若缺 `sdk:generate` 或 SDK drift check，补齐脚本、文档和测试。
- [x] Q001-P2-OPENAPI-REGISTRY-TAG-DRIFT：实现 registry apiTags 与 OpenAPI tags 的 drift check，失败时输出具体 module/tag/path。
- [x] Q001-P2-ADMIN-ROUTE-ACCESS-DRIFT：实现 module registry menus/admin routes 与 Admin `.umirc.ts`、`access.ts` 的 drift check。
- [x] Q001-P2-PERMISSION-DEPRECATION：新增 permission code deprecation/migration policy，禁止静默删除权限码。
- [x] Q001-P2-CONTRACT-PAGINATION：统一分页、排序、过滤 contract，确保 API/SDK/Admin 使用同一结构。
- [x] Q001-P2-CONTRACT-ERROR：统一错误响应 contract，确保 OpenAPI、SDK、Admin request 错误处理一致。
- [x] Q001-P2-CONTRACT-EXPORT-UPLOAD：检查 table export、file upload/download、current-page export contract，补齐 validators 与 tests。
- [x] Q001-P2-MODULE-ADMISSION：新增 module admission checklist，用于后续 collaboration、workflow、integration 进入 registry 前审查。

---

## 3. OpenForge Backlog

- [x] Q001-P3-CONTRACTS-V1：把 OpenForge contracts 升级到 V1：template、apply、manifest、rollback、generated marker、patch plan、config。
- [x] Q001-P3-SCHEMA-CONFIG-DSL：实现 schema/config DSL V1，支持 fields、relations、list、filter、form、detail、actions、permissions、openapi、admin、sdk、tests、docs、export、audit。
- [x] Q001-P3-TEMPLATE-PACK：实现默认模板包 `openforge-default-nest-umi-v1`，覆盖 API/Admin/SDK/Test/Docs/Prisma draft/Patch。
- [x] Q001-P3-VFS：实现 virtual file system，模板输出必须 deterministic，所有 generated 文件带 marker。
- [x] Q001-P3-SAFE-APPLY：实现 `openforge:apply`，默认 dry-run，真实写入必须 `--yes`，只能创建新文件或更新带 marker 文件。
- [x] Q001-P3-MANIFEST：实现 `.openforge/manifests/*.json`，记录 schema hash、registry hash、openapi hash、before/after hash、操作列表。
- [x] Q001-P3-ROLLBACK：实现 `openforge:rollback`，只能基于 manifest 回滚，人工修改后的 generated 文件必须 blocked。
- [x] Q001-P3-API-GENERATOR：生成 NestJS module/controller/service/dto/repository/spec skeleton；不直接修改 app.module.ts，只生成 patch plan。
- [x] Q001-P3-ADMIN-GENERATOR：生成 Umi/Ant Design ProTable、Form、Descriptions、ExportButton、smoke skeleton；不直接修改 routes/access，只生成 patch plan。
- [x] Q001-P3-SDK-TEST-DOCS：生成 SDK client/types/spec、API/Admin tests、docs fragment/runbook/patch-review。
- [x] Q001-P3-DOCTOR-GATE-E2E：实现 `openforge:doctor`、`openforge:gate` 和 temp repo apply/rollback e2e。
- [x] Q001-P3-GOLDEN-SNAPSHOTS：为模板输出建立 golden snapshot tests，禁止无意义 diff。

---

## 4. 协同办公 Backlog

- [x] Q001-P4-MESSAGE-REGISTRY：新增 `collaboration.message` registry、permissions、menus、apiTags。
- [x] Q001-P4-MESSAGE-MODEL-API：实现 message Prisma model、repository、API、SDK、Admin page，支持 read/unread、mark read、archive/delete policy。
- [x] Q001-P4-NOTICE：实现 `collaboration.notice`，支持 draft/publish/archive、target audience、valid time、Admin/SDK/tests。
- [x] Q001-P4-TODO：实现 `collaboration.todo`，支持 source type、businessType/businessId、assign/complete/cancel、timeline、Admin/SDK/tests。
- [x] Q001-P4-APPROVAL-LITE：实现 `collaboration.approval-lite`，参考 NestWeb approval-requests 与 Antdpro6 Approvals，只做单步 approve/reject，不做 BPMN。
- [x] Q001-P4-COLLAB-AUDIT：协同模块所有写操作进入 audit log，消息/待办/审批状态变更可追踪。
- [x] Q001-P4-COLLAB-E2E：补齐 message/todo/approval-lite 的 API + Admin smoke + SDK tests。

---

## 5. 工作流 / 报表 / 任务 Backlog

- [x] Q001-P5-JOB-REGISTRY：新增 `monitor.job` 或 `optional.job` registry、permissions、menus、apiTags。
- [x] Q001-P5-JOB-RUNTIME：实现 job definition、run log、manual trigger、enable/disable、BullMQ adapter、retry policy、Admin/SDK/tests。
- [x] Q001-P5-CACHE：实现 `monitor.cache`，支持 key prefix read-only listing、安全 clear policy、Admin/SDK/tests。
- [x] Q001-P5-ONLINE-USER：实现 `monitor.online-user`，支持 session/token activity view；kick-out 若实现必须有权限与审计。
- [x] Q001-P5-REPORT-DESIGN：实现 `optional.report` 设计位和最小 report definition/query schema，不做完整报表设计器。
- [x] Q001-P5-EXPORT-JOB-DESIGN：设计 async export job，必须绑定 file/job/permission/expiry/audit，不做大数据导出生产实现，除非闭环完整。
- [x] Q001-P5-WORKFLOW-ADMISSION：新增 workflow admission doc，只桥接 Approval Lite，不做 BPMN/流程设计器。

---

## 6. 集成能力 Backlog

- [x] Q001-P6-INTEGRATION-CORE：实现 integration provider registry、config model、secret reference、credential redaction、health check、audit、enable/disable、Admin/SDK/tests。
- [x] Q001-P6-MAIL：实现 `integration.mail` provider abstraction、template、outbox、send log、retry、preview、permissions、tests。
- [x] Q001-P6-SMS：实现 `integration.sms` provider abstraction、template、outbox、rate limit、send log、验证码安全设计、tests。
- [x] Q001-P6-OAUTH：实现 `integration.oauth` provider config、callback contract、state security、account binding、audit、Admin/tests。
- [x] Q001-P6-WECHAT-DESIGN：输出 wechat integration design，不直接做完整微信业务。
- [x] Q001-P6-WEBSOCKET-DESIGN：输出 websocket integration design，明确 auth、room、event、audit、安全边界。
- [x] Q001-P6-PAY-PROVIDER-DESIGN：输出 payment provider design，仅做 provider/mock/sandbox 边界，未完成回调幂等、退款、对账前不做真实支付闭环。

---

## 7. Cycle 001 收口
