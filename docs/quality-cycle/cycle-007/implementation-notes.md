# cycle-007 Implementation Notes

## Plan

- Add a reusable Admin current-page CSV export button with typed columns and sensitive-column exclusion.
- Wire current-page export toolbars into existing collaboration, operations, and integration fixture-backed pages.
- Keep export summary-only and bounded by the S8 protocol.
- Update OpenForge docs with generated Admin export guidance.

## Implemented

- Added `apps/admin/src/pages/shared/CurrentPageExportButton.tsx` as the reusable current-page CSV export kernel.
- The export column contract supports `sensitive: true`; `getExportableColumns` removes sensitive columns before CSV header/value generation.
- Export rows are bounded by `createCurrentPageExportProtocolFixture().maxRows`, use CSV escaping, and download client-side without invoking async backend export jobs.
- Added current-page export toolbars to collaboration Admin pages: messages, notices, todos, and approval-lite.
- Added current-page export toolbars to operations Admin pages: jobs, online users, reports, and export jobs.
- Added current-page export toolbars to integration Admin pages: providers, mail, sms, OAuth, billing design, WeChat, and WebSocket.
- Kept exports summary-only by omitting or marking sensitive fields such as body/comment/payload/config/secretRef/tokenId/querySchema/accountBinding.
- Updated OpenForge V1 architecture and template-authoring docs to require generated Admin exports to be current-page CSV only, bounded by the S8 protocol, and sensitive-column excluded.

## Verification

Focused checks and the applicable gate passed. Command transcripts are intentionally omitted; keep unique defects, guards and decisions only.
