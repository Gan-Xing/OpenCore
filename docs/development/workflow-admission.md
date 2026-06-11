# Workflow Admission

Cycle 001 permits only an approval-lite bridge. It does not admit BPMN, a process designer, complex multi-step approval, or workflow marketplace behavior.

## Approval-Lite Bridge

Approval-lite can expose:

- business type and business id references,
- submitter and approver,
- single-step approve/reject,
- idempotency key,
- operator comment,
- audit trail.

OpenForge schemas for approval-lite or future workflow-adjacent pages must mark
operator comments, audit payloads, task payloads and idempotency metadata as
`detailOnly` or `sensitive` when they should not appear in current-page CSV or
search text. Generated Admin pages must route those fields through shared
redaction-aware detail/export helpers.

## Future Workflow Admission

Before a full workflow module can enter OpenCore, it needs:

- registry entry under `optional.workflow`,
- explicit permission and menu contract,
- OpenAPI/SDK/Admin route drift checks,
- process definition contract,
- task assignment contract,
- audit and idempotency model,
- migration and rollback plan.

Until then, workflow remains a design/admission boundary around approval-lite.
