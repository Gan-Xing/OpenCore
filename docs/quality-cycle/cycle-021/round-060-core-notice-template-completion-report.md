# Round 60 Completion Report: core.notice Notification Templates

Date: 2026-06-13
Feature commit: `2f22e76 feat(notice): add notice template management / 新增通知模板管理`

## Scope

Round 60 productized the station-notice template stage for `core.notice`.
OpenCore now supports persisted notification templates, strict render previews
and draft notice creation from a selected template.

This round deliberately stayed inside System Notice foundation scope. It did
not add real WebSocket/mail/SMS fan-out, delivery adapter execution, tenant
notices, BPM approval or member/mobile notification channels.

## Delivered

- Prisma `SystemNoticeTemplate` model, migration and `release.window` seed.
- `@opencore/system` DTOs, records, seed/Prisma repositories, service methods
  and tests for template CRUD, simple-list, render preview and create-notice.
- API routes under `/api/core/notices/templates*` protected by existing
  `core:notice:*` permissions.
- SDK types/client/spec, registry fixtures and OpenAPI snapshot updates.
- Admin System Notices `System Notice Templates` tab with bounded filters,
  current-page export, template CRUD, detail drawer, render preview and
  `Create draft from template`.
- Fixed-port/deploy/public smoke guards for seeded template render,
  missing/extra params, `enabled`/`pinned` deserialization, create/list/render,
  draft creation, disabled-template render blocking and cleanup.
- Deploy-script stale bundle guard for the System Notices template UI markers.

## Verification

- Standard round gates passed; repeated command transcripts were removed during docs compaction.

Public deployment:

- API: `http://144.217.243.161:39172`
- Admin: `http://144.217.243.161:39174`
- Admin main bundle: `umi.502d85c6.js`
- System Notices chunk: `p__System__Notices.c0987784.async.js`

Public Admin chunk verification proved these deployed markers:

- `System Notice Templates`
- `Notice template render preview`
- `Create draft from template`
- `core-notice-templates`

## Smoke Evidence

`tools/scripts/smoke-core-notice.mjs` now verifies:

- `core.notice.template.simple-list`
- `core.notice.template.render`
- `core.notice.template.missing-param-guard`
- `core.notice.template.extra-param-guard`
- `core.notice.template.enabled-deserialization-guard`
- `core.notice.template.create`
- `core.notice.template.list-filter`
- `core.notice.template.render-created`
- `core.notice.template.pinned-deserialization-guard`
- `core.notice.template.create-notice`
- `core.notice.template.update`
- `core.notice.template.disabled-render-guard`
- `core.notice.template.delete`

## Remaining Notice Debt

- Delivery adapter design and execution.
- Any admitted WebSocket/mail/SMS fan-out.
- Tenant-scoped notices.
- BPM approval around announcements.
- Member/mobile notification channels.

These remain separate foundation/productization stages and are not hidden
inside Round 60.
