# cycle-008 Backlog

- [x] Q008-P1-ADMIN-CURRENT-PAGE-FILTER-KERNEL：阶段 1；问题：Admin admitted fixture pages still render static `ProTable` rows with `search={false}` and no reusable bounded current-page filter helper；参考来源：Antdpro6 ProTable search forms、NestWeb bounded query DTOs、OpenCore cycle-003 list query contracts；涉及文件：`apps/admin/src/pages/shared/*`；实施要求：新增 reusable current-page filter hook/helper，支持 search fields、select filters、reset、filtered/current row count；禁止 arbitrary SQL/JSON query DSL；完成标准：Admin pages can reuse one bounded local filter semantic.

- [x] Q008-P2-ADMIN-SMOKE-FILTER-GUARD：阶段 2；问题：Admin smoke 只检查 route/access/SDK/detail/export 存在，不能防止 S10/S11/S12 pages 回退成 unfiltered static lists；参考来源：Antdpro6 E2E/list smoke、RuoYi/Yudao query form conventions；涉及文件：`apps/admin/scripts/smoke-test.mjs`；实施要求：新增 admitted page filter guard，检查 pages import/use shared current-page filter helper and export filtered rows；完成标准：缺少 filter helper 的 admitted pages 会 fail smoke.

- [x] Q008-P3-OPENFORGE-FILTER-DOCS：阶段 3；问题：OpenForge docs 要求 bounded list query DTOs，但未要求 generated Admin list pages surface matching bounded current-page filters；参考来源：Yudao/RuoYi field query forms、OpenForge Admin generator；涉及文件：`docs/development/openforge-template-authoring.md`、`docs/development/openforge-v1-architecture.md`；实施要求：补充 generated Admin filter guidance，明确 current-page only、bounded field controls、export uses filtered current rows；完成标准：生成器文档明确 list filter/detail/action/export 四层边界。

- [x] Q008-P4-COLLAB-ADMIN-FILTERS：阶段 4；问题：messages/notices/todos/approval-lite pages 不展示 cycle-003 bounded query fields；参考来源：NestWeb messages/approval query DTOs、Antdpro6 Approval Requests ProTable search；涉及文件：`apps/admin/src/pages/Collaboration/*.tsx`；实施要求：新增 current-page search + status/recipient/assignee/requester/approver/source filters as applicable；export rows must use filtered current rows；完成标准：4 个 collaboration pages expose bounded filters and export filtered rows.

- [x] Q008-P5-OPERATIONS-ADMIN-FILTERS：阶段 5；问题：jobs/cache/online-users/reports/export-jobs pages 缺少 enabled/prefix/active/owner/status/source-like filters；参考来源：RuoYi/Yudao job/report list query forms、OpenCore operations query contracts；涉及文件：`apps/admin/src/pages/Monitor/Jobs.tsx`、`Cache.tsx`、`OnlineUsers.tsx`、`apps/admin/src/pages/Optional/*.tsx`；实施要求：新增 bounded current-page filters，jobs/reports use enabled filters, cache uses prefix filter, online users active filter, design-only export jobs status/resource search；export rows use filtered current rows；完成标准：operations pages filter summary rows without triggering scheduler/cache/report/export execution.

- [x] Q008-P6-INTEGRATION-ADMIN-FILTERS：阶段 6；问题：integration pages lack provider/template/outbox/design bounded filters；参考来源：Yudao mail/sms/provider query pages、OpenCore integration query contracts；涉及文件：`apps/admin/src/pages/Integrations/*.tsx`；实施要求：provider filters for type/enabled/health, mail/sms filters for enabled and outbox status/provider where visible, OAuth provider filter, design-only topic/status search; export rows use filtered current rows；完成标准：integration filters do not expose secrets/config/payload and do not widen provider/send/pay/WeChat/WebSocket boundaries.

- [x] Q008-CLOSE-001：更新 `docs/quality-cycle/cycle-008/implementation-notes.md`。
- [x] Q008-CLOSE-002：写 `docs/quality-cycle/cycle-008/completion-report.md`。
- [x] Q008-CLOSE-003：运行全仓 gate。
- [x] Q008-CLOSE-004：运行 `node tools/quality-cycle/opencore-quality-cycle.mjs complete-cycle --max 20 --run-gate` 并确认 completedCycles +1。
