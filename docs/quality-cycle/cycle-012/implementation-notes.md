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

## Verification

Focused checks and the applicable gate passed. Command transcripts are intentionally omitted; keep unique defects, guards and decisions only.
