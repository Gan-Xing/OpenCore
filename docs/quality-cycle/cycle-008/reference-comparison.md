# cycle-008 Reference Comparison

## NestWeb

- `/home/ubuntu/dev/NestWeb/src/messages/messages.service.ts` builds message list conditions from bounded query fields such as scope, type, category, keyword, business type/id and state.
- `/home/ubuntu/dev/NestWeb/src/approval-requests/approval-requests.service.ts` builds approval list conditions from bounded fields such as status, business type, applicant, approver role, keyword, mine and pending-for-me.
- System/config/dict services use explicit query DTO fields instead of arbitrary filter pass-through.
- Lesson for OpenCore: Admin list filtering should expose known field controls that map to stable contracts, not a generic query DSL.

## Antdpro6

- `/home/ubuntu/dev/Antdpro6/src/pages/Auth/Users/index.tsx`, roles, permissions and menus use `ProTable` search plus request `params/sort/filter`.
- `/home/ubuntu/dev/Antdpro6/src/pages/System/Dicts/index.tsx`, config, files, login logs and system logs use ProTable search forms with current export actions.
- `/home/ubuntu/dev/Antdpro6/src/pages/Approvals/Requests/index.tsx` keeps approval list search and export in the table surface.
- Lesson for OpenCore: the official Admin should keep searchable/filterable list ergonomics, but because OpenCore fixture pages are current-page only in this stage, filtering must stay local and bounded.

## RuoYi / ruoyi-vue-pro

- The RuoYi/Yudao comparison docs in this repo identify system, monitor, report, integration and codegen modules as reference capabilities, and repeatedly separate query/list/filter behavior from export and mutation behavior.
- Typical RuoYi/Yudao list pages pair query forms with explicit field names and permissions; export remains a separate permissioned action.
- Lesson for OpenCore: keep list query controls explicit and separate from export/action surfaces.

## Yudao / yudao-ui-admin-vue3

- Yudao-style admin pages generally show field-specific query controls before list and export actions.
- OpenCore should learn the product convention, but keep the implementation native to React 19, Umi Max, Ant Design Pro V6 and the existing SDK/registry contracts.

## OpenCore Gap

- `apps/admin/src/pages/Collaboration/*.tsx`, `apps/admin/src/pages/Monitor/Jobs.tsx`, `OnlineUsers.tsx`, `apps/admin/src/pages/Optional/*.tsx`, and `apps/admin/src/pages/Integrations/*.tsx` have details and export actions but no visible bounded filters.
- `docs/development/openforge-template-authoring.md` and `docs/development/openforge-v1-architecture.md` require bounded API query DTOs, but do not yet require generated Admin current-page filters.
