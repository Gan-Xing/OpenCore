# cycle-011 Backlog

- [x] Q011-P1-CORE-WRAPPER-READONLY-POLICY：阶段 1；问题：core wrappers do not expose a visible read-only/current-state policy；参考来源：Antdpro6 permission-aware action columns、OpenCore S10-S12 guarded action labels；涉及文件：`apps/admin/src/pages/System/RbacTable.tsx`、`SystemManagementTable.tsx`；实施要求：wrappers accept `readOnlyReason`, display it in the toolbar, keep detail/export active, and disable RBAC create/edit/delete controls with that reason；测试要求：`NX_DAEMON=false pnpm nx run-many -t typecheck -p admin,sdk`、`NX_DAEMON=false pnpm nx test admin`；完成标准：core wrapper mutation-looking controls are no longer enabled placeholders.

- [x] Q011-P2-RBAC-USER-ROLE-POLICIES：阶段 2；问题：users/roles pages do not state why mutation controls are disabled；参考来源：NestWeb RBAC write permission separation、RuoYi/Yudao user/role permission gates；涉及文件：`apps/admin/src/pages/System/Users.tsx`、`Roles.tsx`；实施要求：pass explicit read-only reasons for fixture-backed user/role pages；测试要求：`NX_DAEMON=false pnpm nx test admin`；完成标准：users/roles detail/filter/export stay active while mutation controls are disabled with reasons.

- [x] Q011-P3-RBAC-PERMISSION-MENU-POLICIES：阶段 3；问题：permissions/menus are registry-managed but the UI still shows mutation affordances；参考来源：Antdpro6 Auth permissions/menus system-managed copy、OpenCore module-registry ownership；涉及文件：`apps/admin/src/pages/System/Permissions.tsx`、`Menus.tsx`；实施要求：pass read-only reasons that identify registry-managed permission/menu ownership；测试要求：`NX_DAEMON=false pnpm nx test admin`；完成标准：permissions/menus communicate registry ownership before writes exist.

- [x] Q011-P4-SYSTEM-SECURITY-READONLY-POLICIES：阶段 4；问题：system/security wrappers lack visible read-only policy reasons for fixture/log pages；参考来源：RuoYi/Yudao log detail pages, NestWeb system config redaction boundary；涉及文件：`apps/admin/src/pages/System/Dicts.tsx`、`Config.tsx`、`Files.tsx`、`apps/admin/src/pages/Security/LoginLogs.tsx`、`OperationLogs.tsx`；实施要求：pass read-only reasons that distinguish fixture-backed system pages from diagnostic log pages；测试要求：`NX_DAEMON=false pnpm nx test admin`；完成标准：system/security pages show visible no-mutation policy while detail/export remain available.

- [x] Q011-P5-ADMIN-SMOKE-READONLY-GUARD：阶段 5；问题：smoke tests do not guard disabled mutation controls or read-only reasons；参考来源：OpenCore smoke-test conventions；涉及文件：`apps/admin/scripts/smoke-test.mjs`；实施要求：assert wrappers include disabled mutation controls/read-only policy rendering and core pages pass `readOnlyReason`；测试要求：`NX_DAEMON=false pnpm nx test admin`；完成标准：enabled placeholder mutation controls cannot regress silently.

- [x] Q011-P6-OPENFORGE-READONLY-AFFORDANCE-DOCS：阶段 6；问题：OpenForge docs do not tell generated core wrappers to disable write affordances while fixture-backed/read-only；参考来源：OpenForge Admin template docs、RuoYi/Yudao permission directive conventions；涉及文件：`docs/development/openforge-template-authoring.md`、`docs/development/openforge-v1-architecture.md`；实施要求：document generated core wrappers must show read-only reasons and disable mutation-looking controls until real write contracts are admitted；测试要求：`pnpm openforge:doctor`、`pnpm openforge:gate`；完成标准：generated Admin guidance matches core wrapper affordances.

- [x] Q011-CLOSE-001：更新 `docs/quality-cycle/cycle-011/implementation-notes.md`。
- [x] Q011-CLOSE-002：写 `docs/quality-cycle/cycle-011/completion-report.md`。
- [x] Q011-CLOSE-003：运行全仓 gate。
- [x] Q011-CLOSE-004：运行 `node tools/quality-cycle/opencore-quality-cycle.mjs complete-cycle --max 20 --run-gate` 并确认 completedCycles +1。
