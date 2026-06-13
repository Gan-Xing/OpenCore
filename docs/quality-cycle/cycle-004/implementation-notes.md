# cycle-004 Implementation Notes

## Plan

- Guard unsafe action/state transitions in seed and Prisma repositories.
- Expand SDK path specs for existing S10/S11/S12 action contracts.
- Surface action policies in fixture-backed Admin pages.
- Update OpenForge docs with state guard requirements for action endpoints.

## Implementation Evidence

- Platform core guard helpers added:
  - `assertMessageReadable`, `assertMessageNotDeleted`, `assertNoticeCanPublish`, `assertNoticeNotArchived`, `assertTodoOpen`
  - `assertJobEnabled`, `assertSessionActive`
  - `assertProviderReadyForOutbox`, `assertTemplateEnabled`
- Seed and Prisma repositories now apply the same guard semantics for collaboration, operations, and integration actions.
- Collaboration now rejects deleted-message actions, archived notice publish/archive repeats, and terminal todo assign/complete/cancel repeats.
- Operations now rejects disabled job trigger and repeated kick-out for already revoked sessions. Kick-out responses include `revokedBy` and `revokedReason` audit fields.
- Integration outbox enqueue now rejects disabled providers, wrong provider/channel combinations, and disabled templates with `BadRequestException`.
- SDK action path specs now cover the broader S10/S11/S12 action matrix.
- Admin fixture pages now display action-policy columns for collaboration records, jobs, online users, providers, and templates.
- OpenForge docs now require current-state guards for generated action endpoints and explicit dry-run/confirmation for broad/destructive actions.

## Verification

Focused checks and the applicable gate passed. Command transcripts are intentionally omitted; keep unique defects, guards and decisions only.
