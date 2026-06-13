# cycle-008 Implementation Notes

## Plan

- Add a reusable current-page filter helper/hook for Admin fixture-backed tables.
- Keep filters local, bounded and explicit; do not introduce arbitrary query expressions or backend behavior.
- Wire filtered rows into table data sources and current-page export actions.
- Add Admin smoke coverage that requires admitted S10/S11/S12 pages to use the shared filter helper.
- Update OpenForge docs with generated Admin filter guidance.

## Implemented

- Added `apps/admin/src/pages/shared/CurrentPageFilters.tsx` with bounded current-page search fields, select filters, reset behavior, row count display and reusable option generation.
- Wired filtered rows into collaboration pages: messages, notices, todos and approval-lite.
- Wired filtered rows into operations pages: jobs, cache, online users, reports and export jobs.
- Wired filtered rows into integration pages: providers, mail, sms, OAuth, billing design, WeChat and WebSocket.
- Updated all pages with current-page export actions to pass `filteredRows`, so export respects the visible current-page filters.
- Extended `apps/admin/scripts/smoke-test.mjs` so admitted S10/S11/S12 pages must use `useCurrentPageFilters`, bind table data to `filteredRows`, and export `filteredRows` when an export button exists.
- Updated OpenForge V1 docs so generated Admin list pages must pair bounded query DTOs with bounded current-page filters and filtered current-page export rows.
