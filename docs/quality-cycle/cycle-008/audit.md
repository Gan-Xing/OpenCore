# cycle-008 Audit

London time: 2026-06-11 03:31:51 Europe/London

## Findings

Cycle 003 added bounded server-side list filter contracts for collaboration, operations, and integration APIs. Cycles 006 and 007 then added Admin detail drawers and current-page CSV export actions. The remaining Admin gap is that these admitted fixture-backed pages still render static `ProTable` data sources with `search={false}` and no visible current-page search/filter controls.

This creates three quality problems:

- The Admin surface does not reflect the bounded query fields already present in SDK/API contracts (`status`, `enabled`, `queueName`, `owner`, `providerCode`, `type`, `healthStatus`, `assignee`, `recipient`, etc.).
- The current-page export action exports all fixture rows even after a user would expect an on-page filter to narrow the current working set.
- OpenForge V1 docs require bounded list query DTOs, but generated Admin guidance does not yet require matching visible list filters for those bounded fields.

## Scope Decision

Cycle 008 will add current-page filter governance for already admitted Admin pages only. It will not add arbitrary SQL/JSON filters, backend query behavior, async export execution, real report designer behavior, workflow, CRM, ERP, MES, WMS, mall, member, payment execution, multitenancy, AI, RAG, or Agent behavior.

## Target

- Add a reusable Admin current-page filter helper/hook.
- Wire bounded search/select filters into collaboration, operations, and integration Admin pages.
- Make current-page export operate on the filtered current page rows.
- Extend Admin smoke checks so admitted S10/S11/S12 pages cannot regress to static unfiltered fixture lists.
- Extend OpenForge docs so generated Admin pages pair bounded list query DTOs with visible Admin current-page filters.
