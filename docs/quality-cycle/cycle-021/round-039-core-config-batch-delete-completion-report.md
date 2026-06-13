# Round 39: core.config Batch Deletion Completion Report

Feature commit:
`4940291 feat(core-config): add batch config deletion / 新增配置批量删除`

## Scope

Round 39 continued `core.config` productization by adding selected-row batch
deletion. This is a minimal deployable stage, not the final configuration
management product boundary.

## Implemented

- `DELETE /api/core/config/batch` is guarded by `core:config:delete`.
- The request body uses OpenCore's key identity: `{ keys: string[] }`.
- Batch input rejects empty arrays, non-string/empty keys, duplicate keys and
  missing configs.
- Successful deletion returns `{ deleted: true, affected, keys }`.
- Service cache invalidation runs for every deleted key.
- Seed and Prisma repositories implement the same batch-delete contract.
- SDK/OpenAPI now expose typed config batch deletion.
- Admin Config now has row selection and a `Delete selected` action.
- Admin static smoke and API smoke lock the UI/service markers and guard paths.

## Verification

- Standard round gates passed; repeated command transcripts were removed during docs compaction.

## Public Verification

- Public API: `http://144.217.243.161:39172`
- Public Admin: `http://144.217.243.161:39174`
- Public `pnpm smoke:core-config` passed and included
  `core.config.batch-delete.*`.
- Public Admin Config chunk `/p__System__Config.8795ee37.async.js` contains
  batch-delete UI markers.
- Public Admin main bundle `/umi.257e0bb2.js` contains `/core/config/batch`.
- Public Admin same-origin `/api/core/config/batch` created two temporary
  configs, batch-deleted both and confirmed both return 404.

## Remaining Config Debt

- Broader runtime feature-flag propagation remains out of this stage.
- Built-in-config deletion policy remains out of this stage until OpenCore
  admits a dedicated field/seed/UI/migration loop.
- Secret vault/KMS integration remains out of this stage.
