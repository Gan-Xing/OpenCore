# cycle-012 Implementation Notes

## Plan

1. Add a shared `redactDetailJsonValue` helper in `ReadOnlyDetailDrawer`.
2. Redact nested plain-object values by sensitive key before JSON serialization.
3. Keep explicit page-level redaction intact, especially system config values with `visibility === 'secret'`.
4. Add an Admin smoke guard that requires the helper, sensitive-key coverage and redacted JSON serialization call.
5. Update OpenForge docs so generated Admin detail drawers inherit this rule.
6. Run focused Admin/SDK/OpenForge and quality-cycle gates.

## Notes

- The helper redacts keys matching password, secret, token, credential, authorization, API key or client secret terminology.
- The helper recurses through arrays and plain objects. Non-plain objects are left to the normal JSON serializer.
- The matcher intentionally does not redact every field containing `key`; Admin records include safe identifiers such as config keys, storage keys and request ids.

## Implemented

- `apps/admin/src/pages/shared/ReadOnlyDetailDrawer.tsx` now exports `redactDetailJsonValue` and applies it before serializing each JSON section.
- `apps/admin/scripts/smoke-test.mjs` now checks that the shared drawer keeps recursive sensitive-key redaction and serializes `redactDetailJsonValue(section.value)`.
- `docs/development/openforge-template-authoring.md` and `docs/development/openforge-v1-architecture.md` now require generated Admin detail JSON sections to use the shared recursive redaction guard.
- `rg "jsonSections" apps/admin/src/pages -n` confirmed current admitted/core JSON detail payloads converge through the shared drawer.

## Focused Verification

- `pnpm exec prettier --write apps/admin/src/pages/shared/ReadOnlyDetailDrawer.tsx apps/admin/scripts/smoke-test.mjs docs/development/openforge-template-authoring.md docs/development/openforge-v1-architecture.md docs/quality-cycle/cycle-012/audit.md docs/quality-cycle/cycle-012/reference-comparison.md docs/quality-cycle/cycle-012/backlog.md docs/quality-cycle/cycle-012/implementation-notes.md`
- `NX_DAEMON=false pnpm nx run-many -t typecheck -p admin,sdk`
- `NX_DAEMON=false pnpm nx test admin`
- `NX_DAEMON=false pnpm nx run admin:lint`
- `NX_DAEMON=false pnpm nx test sdk --runInBand`
- `pnpm registry:admin-routes:check`
- `pnpm openforge:doctor`
- `pnpm openforge:gate`
