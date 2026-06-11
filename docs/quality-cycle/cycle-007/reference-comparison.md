# cycle-007 Reference Comparison

## NestWeb

- NestWeb exposes system-log and file/download style operational surfaces separately from normal CRUD and queue behavior.
- The useful pattern for OpenCore is that export/download paths are explicit and permissioned rather than implicit table actions.

## Antdpro6

- `src/components/TableExportButton` serializes current table rows to CSV and warns when there is no data.
- `src/pages/MessageCenter/index.tsx` and `src/pages/Approvals/Requests/index.tsx` use table toolbar export actions with explicit columns.
- Antdpro6 access includes `canExportData`, keeping export as a visible permissioned Admin operation.

## RuoYi / ruoyi-vue-pro

- Controllers expose `/export-excel` endpoints with dedicated `*:export` permissions and page request objects.
- Job, mail, SMS, CRM, ERP and other modules keep export separate from detail and mutation endpoints.
- OpenCore should copy the permission/contract separation, not the Java/Vue implementation.

## Yudao / yudao-ui-admin-vue3

- API modules use `request.download({ url: '.../export-excel', params })` for explicit export methods.
- Mail/SMS/job APIs distinguish page/detail/export/send/trigger operations.
- For OpenCore S10/S11/S12, the bounded current-page CSV export is the safe equivalent; async export remains design-only.

## OpenCore Delta For Cycle 007

- Add a reusable Admin current-page export button that follows the S8 protocol and excludes sensitive columns.
- Add current-page export actions to admitted collaboration, operations, and integration Admin pages.
- Keep provider config, secret refs, online session token ids, outbox payloads, and report execution out of CSV exports.
- Update OpenForge docs so generated Admin export buttons must be bounded, current-page only, and sensitive-column aware.
