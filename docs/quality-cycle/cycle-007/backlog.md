# cycle-007 Backlog

- [x] Q007-P1-ADMIN-CURRENT-PAGE-EXPORT-KERNEL：阶段 1；问题：Admin 缺少可复用 current-page CSV export kernel，RBAC 只有占位按钮，S10/S11/S12 页面无统一导出行为；参考来源：Antdpro6 `TableExportButton`、OpenCore `CURRENT_PAGE_EXPORT_PROTOCOL`；涉及文件：`apps/admin/src/pages/shared/*`、`packages/sdk/src/registry-fixtures.ts`；实施要求：新增 current-page export button/helper，使用 S8 maxRows/scope，空数据提示，CSV escaping，支持 sensitive column exclusion；完成标准：Admin 页面可复用同一导出语义且不触发后端异步导出。

- [x] Q007-P2-EXPORT-COLUMN-CONTRACTS：阶段 2；问题：Admin export columns 没有 typed `sensitive` metadata，无法系统性排除 token/config/payload；参考来源：Antdpro6 export columns、RuoYi/Yudao export permission separation；涉及文件：`apps/admin/src/pages/shared/CurrentPageExportButton.tsx`、SDK tooling fixture/spec；实施要求：定义 typed export column contract，敏感列默认排除，导出计划显示实际导出列数/row count；完成标准：sensitive columns 不进入 CSV header/value。

- [x] Q007-P3-OPENFORGE-EXPORT-DOCS：阶段 3；问题：OpenForge docs 提到 export button，但没有说明 current-page、maxRows、sensitive-column policy；参考来源：Yudao/RuoYi `export-excel` permissioned APIs、OpenForge Admin generator；涉及文件：`docs/development/openforge-template-authoring.md`、`docs/development/openforge-v1-architecture.md`；实施要求：补充 generated Admin export guidance，限制 V1 为 current-page CSV，禁止隐式 async/bulk export；完成标准：生成器文档明确 list/detail/action/export 四层边界。

- [x] Q007-P4-COLLAB-ADMIN-EXPORTS：阶段 4；问题：collaboration Admin pages 无 current-page export；参考来源：Antdpro6 MessageCenter/Approvals export toolbar；涉及文件：`apps/admin/src/pages/Collaboration/*.tsx`；实施要求：为 messages/notices/todos/approval-lite 增加 export toolbar，导出 summary columns，不导出 hidden/deleted 或 detail-only body 扩展；完成标准：4 个 collaboration pages 都有 bounded current-page export。

- [x] Q007-P5-OPERATIONS-ADMIN-EXPORTS：阶段 5；问题：jobs/online-users/reports/export jobs Admin pages 无 current-page export，且 online-user token/query schema 不应进入 CSV；参考来源：RuoYi/Yudao job/report export separation；涉及文件：`apps/admin/src/pages/Monitor/Jobs.tsx`、`OnlineUsers.tsx`、`apps/admin/src/pages/Optional/*.tsx`；实施要求：新增 export toolbar，排除 tokenId、querySchema execution/payload；完成标准：operations export 是 summary-only，不触发 scheduler/report/export execution。

- [x] Q007-P6-INTEGRATION-ADMIN-EXPORTS：阶段 6；问题：integration Admin pages 无 current-page export，provider config/secretRef/outbox payload/template body 不应进入 CSV；参考来源：Yudao mail/sms template export/send separation、OAuth provider config patterns；涉及文件：`apps/admin/src/pages/Integrations/*.tsx`；实施要求：新增 export toolbar，provider config/secretRef/payload/body 列标记 sensitive 或不列入导出，design-only topics 仅导出 summary；完成标准：integration export 不泄露 secrets、不扩大 provider/send/pay/WeChat/WebSocket 边界。
