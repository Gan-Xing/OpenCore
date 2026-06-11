# cycle-004 Reference Comparison

## NestWeb

- `src/messages` and `src/approval-requests` expose action DTOs and service-level state changes for read/approval flows.
- Approval Lite uses explicit approve/reject actions with query DTOs, which maps cleanly to OpenCore's single-step approval boundary.
- The useful reference is action contract shape, not NestWeb business code migration.

## Antdpro6

- `src/pages/MessageCenter` and `src/pages/Approvals/Requests` expose user-facing mark-read, todo complete/cancel, and approve/reject affordances.
- Locale/service files include explicit action labels and success states, making the allowed action surface visible to operators.
- OpenCore Admin should surface action policy states in the S10/S11/S12 pages even while it remains fixture-backed.

## RuoYi / ruoyi-vue-pro

- Infra job service tests cover status transitions, manual trigger, and invalid status changes.
- Monitor/job/log/cache/session modules keep operations actions bounded around status and explicit administrator intent.
- The key lesson for OpenCore is to reject unsafe actions, not to import Quartz/job implementation details.

## Yudao / yudao-ui-admin-vue3

- `src/api/infra/job`, `jobLog`, `redis`, and system mail/SMS/OAuth APIs keep action endpoints distinct from list queries.
- Vue admin pages expose status-driven operations such as job trigger, template send/test, and OAuth callback contracts.
- OpenCore should preserve provider/mock/design boundaries while enforcing enabled/provider-channel/template-state checks before enqueue.

## OpenCore Delta For Cycle 004

- Add shared guard helpers for terminal/deleted/disabled records.
- Apply the guards in both seed and Prisma repositories.
- Expand SDK path tests for the existing action surface.
- Add concise Admin action-policy columns/tags on existing fixture pages.
- Update OpenForge authoring docs so future generated action endpoints require explicit transition guards.
