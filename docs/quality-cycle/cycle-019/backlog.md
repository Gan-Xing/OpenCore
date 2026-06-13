# cycle-019 Backlog

## Stage 1 - Platform Admin Skeleton Alignment

- [x] ID: CY19-P1
  - Phase: 1 platform kernel
  - Issue: OpenForge generated Admin pages still emit standalone ProTable search/export/detail wiring instead of the shared Admin shell helpers that now define platform behavior.
  - Reference source: Antdpro6 ProTable/TableExportButton centralization; RuoYi generated CRUD pages following platform conventions.
  - Files: `tools/generator/src/render/render-template-pack.ts`, `tools/generator/src/render/render-template-pack.spec.ts`.
  - Implementation requirement: Update `renderAdminPageContent` so generated pages use `useCurrentPageFilters`, `CurrentPageExportButton`, and filtered rows for table/export data. Replace ProTable built-in search with bounded current-page filter controls derived from schema filter/list fields.
  - Test requirement: Extend Admin generator pack tests to assert generated page output imports `CurrentPageExportButton`, imports/uses `useCurrentPageFilters`, binds `dataSource={filteredRows}`, and passes `rows={filteredRows}` to export.
  - Completion standard: generated Admin page snapshot and full quality-cycle gate pass.

## Stage 2 - Contracted Export Safety In Generated Admin

- [x] ID: CY19-P2
  - Phase: 2 contract system
  - Issue: Generated export button skeleton only calls `onExport?.(columns)` and does not inherit current-page row limits, sensitive-column exclusion, object-cell redaction, formula-prefix neutralization, or sanitized CSV filenames.
  - Reference source: Antdpro6 TableExportButton pattern; RuoYi/Yudao typed export boundaries.
  - Files: `tools/generator/src/render/render-template-pack.ts`, `tools/generator/src/render/render-template-pack.spec.ts`, `docs/development/export-upload-contract.md`.
  - Implementation requirement: Remove or downgrade the generated standalone export button in favor of generated `CurrentPageExportColumn` definitions consumed by the shared `CurrentPageExportButton`. Generated export columns must mark schema-declared sensitive/detail-only fields as `sensitive: true`.
  - Test requirement: Add template assertions for `CurrentPageExportColumn`, `sensitive: true` where applicable, `resource=`, and absence of a custom local download implementation in generated Admin output.
  - Completion standard: Generated Admin export skeletons inherit the shared CSV protocol without local duplicate serialization code and all OpenForge/admin focused checks pass.

## Stage 3 - OpenForge Detail Redaction In Generated Admin

- [x] ID: CY19-P3
  - Phase: 3 OpenForge
  - Issue: Generated detail skeleton uses `ProDescriptions` and direct `<Tag>{String(record.field)}</Tag>` rendering, bypassing `ReadOnlyDetailDrawer` scalar and JSON redaction.
  - Reference source: NestWeb serializer redaction; Yudao masked system/integration secret presentation.
  - Files: `tools/generator/src/render/render-template-pack.ts`, `tools/generator/src/render/render-template-pack.spec.ts`, `docs/development/openforge-template-authoring.md`.
  - Implementation requirement: Update `renderAdminDetailContent` to render the shared `ReadOnlyDetailDrawer` or generate `DetailField` metadata consumed by it. Generated detail metadata must set `sensitive: true` for token ids, secret refs, credentials, authorization values, API keys and client secrets.
  - Test requirement: Add template assertions for `ReadOnlyDetailDrawer`, `DetailField`, `sensitive: true`, and removal of direct `String(record.<field>)` detail rendering for sensitive fields.
  - Completion standard: Generated detail output follows the same scalar/JSON redaction boundary as hand-written Admin detail drawers and passes transpile/golden tests.

## Stage 4 - Collaboration Generated Page Readiness

- [x] ID: CY19-P4
  - Phase: 4 collaboration
  - Issue: Future generated collaboration pages such as message, notice, todo and approval-lite need the same filtered-list/detail/export safety, especially for message bodies, comments and audit payloads.
  - Reference source: NestWeb message/approval modules; Antdpro6 MessageCenter and Approvals pages; RuoYi notice/workflow conventions.
  - Files: `tools/generator/examples/core.dict.v1.schema.json`, `tools/generator/src/render/render-template-pack.spec.ts`, `docs/development/workflow-admission.md`.
  - Implementation requirement: Add or adapt an OpenForge schema fixture containing body/comment/payload-like fields so generated Admin tests prove collaboration-style sensitive/detail-only fields are excluded from CSV and redacted in detail metadata.
  - Test requirement: Add a generator test fixture assertion covering a collaboration-like schema with sensitive text/detail fields and generated export/detail safeguards.
  - Completion standard: OpenForge tests prove collaboration-style generated pages cannot expose body/comment/payload fields through CSV or raw detail rendering by default.

## Stage 5 - Workflow/Report/Task Generated Boundary

- [x] ID: CY19-P5
  - Phase: 5 workflow/report/task
  - Issue: Future optional report/job generated pages can contain payloads, query schemas, job params or revocation reasons that must stay detail-only or redacted.
  - Reference source: RuoYi/Yudao report/job/workflow module boundaries.
  - Files: `tools/generator/src/render/render-template-pack.ts`, `tools/generator/src/render/render-template-pack.spec.ts`, `docs/development/module-admission-checklist.md`.
  - Implementation requirement: Teach generator field classification or schema authoring guidance to mark report query schemas, job payloads and workflow comments as detail-only/sensitive for generated Admin export/detail output.
  - Test requirement: Add assertion coverage for at least one schema field whose name indicates `payload`, `querySchema`, `token`, `secretRef`, `comment` or equivalent, proving generated output marks it sensitive or omits it from export.
  - Completion standard: Generated optional workflow/report/task skeletons inherit safe detail/export defaults without adding production workflow/BPMN modules.

## Stage 6 - Integration Generated Boundary

- [x] ID: CY19-P6
  - Phase: 6 integration capability
  - Issue: Future generated integration provider/mail/sms/oauth/wechat/websocket pages can include provider config, secret refs, tokens and credentials; generated templates must make these fields safe by default.
  - Reference source: Yudao integration/codegen module organization; RuoYi infra/oauth/mail/sms boundaries; OpenCore cycles 015-018 Admin hardening.
  - Files: `tools/generator/src/render/render-template-pack.ts`, `tools/generator/src/render/render-template-pack.spec.ts`, `docs/development/integration-mail|sms|wechat|websocket|payment design docs`.
  - Implementation requirement: Add sensitive-field classification for integration-like names (`secretRef`, `config`, `tokenId`, `apiKey`, `clientSecret`, `authorization`) and ensure generated detail/export/filter output uses shared redaction helpers and safe export metadata.
  - Test requirement: Add OpenForge generator assertions for integration-like fields showing `sensitive: true`, shared detail drawer usage, and shared current-page export usage.
  - Completion standard: Generated integration skeletons remain provider/mock/design-safe and cannot expose credentials through list/detail/export by default.

## Closeout

- [x] ID: CY19-CLOSE
  - Phase: closeout
  - Completion standard: cycle 019 counted in quality-cycle state and ledger.
