# cycle-006 Implementation Notes

## Plan

- Add a shared Admin read-only detail drawer helper for fixture-backed ProTable pages.
- Add SDK fixture detail selector helpers matching the admitted detail endpoint keys.
- Add detail drawers across collaboration, operations, and integration Admin pages.
- Update OpenForge docs with generated Admin detail drawer guidance.

## Implementation Evidence

- Added shared Admin detail drawer kernel in `apps/admin/src/pages/shared/ReadOnlyDetailDrawer.tsx`:
  - Supports read-only field descriptions, bounded JSON sections, and timeline entries.
  - Contains no mutation or live API behavior.
- Added SDK fixture detail selectors:
  - Collaboration: `findMessageFixture`, `findNoticeFixture`, `findTodoFixture`, `findApprovalLiteFixture`.
  - Operations: `findJobFixture`, `findJobRunFixture`, `findOnlineUserFixture`, `findReportFixture`, `findExportJobDesignFixture`.
  - Integration: `findIntegrationProviderFixture`, `findIntegrationTemplateFixture`, `findIntegrationOutboxFixture`, `findOAuthCallbackContractFixture`, `findIntegrationDesignFixture`.
- Extended SDK fixture tests to assert:
  - Missing detail lookups return `undefined`.
  - Job-run and integration-outbox lookups are scoped by parent key/channel.
  - Provider fixture config remains redacted.
- Added Admin detail drawers:
  - Collaboration: Messages, Notices, Todos, Approval Lite.
  - Operations: Jobs, Online Users, Reports, Export Jobs.
  - Integration: Providers, Mail, SMS, OAuth, Payment Design, WeChat, WebSocket.
- Added related read-only detail context:
  - Jobs show latest run metadata without triggering a scheduler.
  - Reports show query schema without running reports.
  - Export jobs remain design-only.
  - Providers show redacted config and sample outbox payload.
  - Mail/SMS template drawers show sample outbox payloads without sending.
  - Payment, WeChat and WebSocket drawers remain explicitly design-only.
- Updated OpenForge docs so generated Admin table pages must keep list, read-only detail drawers, and action buttons separate.
