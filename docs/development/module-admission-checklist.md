# Module Admission Checklist

Use this checklist before adding collaboration, workflow/report/job, or integration modules to the registry. Tenant-owned CRM, ERP, MES, WMS, mall, member, payment, AI/RAG/Agent, or other business domains must first complete [Business-Domain Admission Template](business-domain-admission-template.md).

## Required Contract Evidence

- Module code uses a permitted layer: `core`, `monitor`, `tool`, `collaboration`, `optional`, or `integration`.
- Permission codes use stable `<layer>:<resource>:<action>` format.
- Menus and Admin routes are explicit and guarded by matching permission codes.
- Admin `.umirc.ts` route `access` keys must map to the same permission code declared by the module registry route.
- OpenAPI tags are declared and pass `pnpm openapi:registry-tags:check`.
- SDK/Admin route drift passes `pnpm registry:admin-routes:check`.
- OpenForge schemas mark payloads, report query schemas, job params, comments,
  provider config, secret refs, tokens, credentials, authorization values, API
  keys and client secrets as `sensitive` or `detailOnly` before generating
  Admin pages.
- Generated Admin list/detail/export output uses the shared current-page
  filters, `CurrentPageExportButton`, `CurrentPageExportColumn` and
  `ReadOnlyDetailDrawer` helpers for those fields.
- Tests cover positive and negative permission paths.

## Scope Guard

- CRM, ERP, MES, WMS, mall, member, tenant, pay production closure, AI, RAG, and Agent modules do not enter core.
- Payment, WeChat, and AI-like capabilities require provider/mock/design boundaries first.
- Workflow starts from approval-lite admission only; no BPMN designer enters without a later handoff.
