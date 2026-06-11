# cycle-006 Reference Comparison

## NestWeb

- `src/messages` and `src/approval-requests` back AntdPro table rows with current entity state before action execution.
- `src/system-log` and queue modules keep operational evidence separate from mutation paths; this maps to read-only Admin detail surfaces rather than implicit row-only actions.

## Antdpro6

- `src/pages/Approvals/Requests/index.tsx` opens a Drawer from row title/action, reloads detail through `approvalRequestsControllerFindOne`, and renders `ProDescriptions` plus action history.
- `src/pages/MessageCenter/index.tsx` keeps table actions and exports close to the current row state and demonstrates that action confirmation should use the selected record.
- System pages use table toolbar/export patterns, reinforcing that detail drawers are part of the operational table surface rather than separate marketing screens.

## RuoYi / ruoyi-vue-pro

- Infra job APIs separate page, detail, next-run-times, status update, trigger, delete, and export operations.
- Mail/SMS template APIs expose page, detail, send, delete, and export flows separately.
- Notice/report modules distinguish list/detail records from execution or designer features.

## Yudao / yudao-ui-admin-vue3

- `src/api/infra/job/index.ts` exposes `getJob` and separate trigger/status APIs.
- `src/api/system/mail/template/index.ts` and `src/api/system/sms/smsTemplate/index.ts` expose `get*Template` detail methods before edit/send flows.
- BPM/process-instance detail views use dedicated detail pages/timeline components; the useful OpenCore pattern is the detail/timeline/read separation, not importing BPMN runtime.

## OpenCore Delta For Cycle 006

- Add a small Admin read-only detail drawer kernel for fixture-backed pages.
- Add SDK fixture detail selector helpers that mirror the detail routes admitted in cycle 005.
- Add detail drawers to existing collaboration, operations, and integration Admin pages.
- Update OpenForge docs so generated Admin table pages include list/detail/action separation, redaction policy, and design-only boundaries.
