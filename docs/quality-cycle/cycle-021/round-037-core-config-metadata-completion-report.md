# Round 37: core.config Metadata Completion Report

Feature commit:
`2a1f324 feat(core-config): add config metadata / 新增系统配置元数据`

## Scope

Round 37 continued `core.config` productization by adding operator-facing
category/name/remark metadata. This is a minimal deployable stage, not the
final configuration-management product boundary.

## Implemented

- `SystemConfig` now persists `category`, required `name` and optional
  `remark`.
- Prisma migration backfills existing rows with `category='system'` and
  `name=key`.
- Config seed records now carry meaningful metadata.
- DTOs, repository contracts, Prisma repository and seed repository normalize
  metadata on create/update.
- Secret config values remain redacted while metadata stays visible.
- SDK config types, registry fixtures and OpenAPI output include the metadata
  fields.
- Admin Config supports category/name/remark in list, detail, create, edit,
  filter and export surfaces.
- `core.config` smoke now guards metadata create/detail/update/export behavior
  plus the existing value-by-key and cache refresh paths.

## Verification

- Standard round gates passed; repeated command transcripts were removed during docs compaction.

## Public Verification

- Public API: `http://144.217.243.161:39172`
- Public Admin: `http://144.217.243.161:39174`
- Public `pnpm smoke:core-config` passed and included
  `core.config.metadata`.
- Public Admin Config chunk `/p__System__Config.a971fcdf.async.js` contains
  `Category`, `Name`, `Remark`, `Refresh cache` and
  `Read public value by key`.
- Public Admin same-origin `/api/core/config?page=1&pageSize=10` returned the
  seeded `opencore.admin.title` row with metadata.

## Remaining Config Debt

- Batch config deletion remains out of this stage.
- Native Excel config export remains out of this stage.
- Secret vault/KMS integration remains out of this stage.
- Broader runtime feature-flag propagation remains out of this stage.
