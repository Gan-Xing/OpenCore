# cycle-005 Reference Comparison

## NestWeb

- `src/messages` and `src/approval-requests` expose message/approval entities with enough fields to support detail panels and action confirmation.
- Approval action flows load a current request before mutating it, which requires a detail-oriented read contract.

## Antdpro6

- `src/pages/Approvals/Requests/index.tsx` has a detail drawer opened from table rows before action execution.
- `src/pages/MessageCenter/index.tsx` renders record-level content and action affordances from row/entity data.
- The useful pattern is stable detail/read contracts for UI drawers, not migration of Antdpro6 UI code.

## RuoYi / ruoyi-vue-pro

- Infra job tests and controllers distinguish page queries, detail lookups, run logs, and status mutations.
- Job detail and job log detail are treated as separate read flows from trigger/update actions.

## Yudao / yudao-ui-admin-vue3

- `src/views/infra/job/JobDetail.vue` and job pages expose explicit detail flows.
- Mail/SMS/notify template forms and send forms call detail APIs such as `getSmsTemplate` before editing or sending.
- Notify message detail pages show content/read status without expanding into a workflow engine.

## OpenCore Delta For Cycle 005

- Add read-only detail endpoints for admitted collaboration, operations, and integration records.
- Keep deleted messages hidden and provider configs redacted.
- Expand SDK clients/specs for detail paths.
- Update permission matrix specs and OpenForge docs to lock detail endpoint expectations.
