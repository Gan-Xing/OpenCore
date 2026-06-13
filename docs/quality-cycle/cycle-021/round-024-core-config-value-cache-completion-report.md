# Round 24 Completion Report: core.config Value Cache Refresh

Date: 2026-06-12  
Feature commit: `79c4e93 feat(core-config): add value cache refresh loop`  
Public API: `http://144.217.243.161:39172`  
Public Admin: `http://144.217.243.161:39174`

## Scope

Round 24 closed the next `core.config` P1 productization gap: runtime-safe
public config value lookup plus config value cache refresh/invalidation.

This round remains one deployable, verifiable and reversible stage. It does
not mark the entire config product as complete.

## Delivered

- Public config value consumer:
  `GET /api/core/config/get-value-by-key?key=...`.
- Private and secret config values are blocked from that public consumer.
- Service-level public value cache in `SystemConfigService`.
- Create/update/delete invalidation for affected cached keys.
- Permission-gated `POST /api/core/config/refresh-cache`.
- OpenAPI and SDK coverage for value lookup and cache refresh.
- Admin Config toolbar `Refresh cache` action.
- Admin Config public row `Read public value by key` action.
- Fixed-port/deploy/public smoke coverage for value lookup, cache
  invalidation, cache refresh and secret-value blocking.

## Verification

- Standard round gates passed; repeated command transcripts were removed during docs compaction.

## Public Verification

- `GET http://144.217.243.161:39172/health/ready` returned 200.
- Public `tools/scripts/smoke-core-config.mjs` passed against
  `http://144.217.243.161:39172` with `OPENCORE_SMOKE_CHECK_DOCS=false`.
- `GET http://144.217.243.161:39174/system/config/` returned 200 with
  `cache-control: no-cache`.
- Public Admin Config chunk `p__System__Config.19ce36ed.async.js` contains
  `Refresh cache` and `Read public value by key`.
- Public main Admin bundle `umi.b4f1a190.js` contains `get-value-by-key`,
  `refresh-cache`, API origin `http://144.217.243.161:39172` and no
  `/api/api/auth/login`.

## Remaining config.product Debt

- Category/name/remark schema enrichment.
- Batch config delete.
- Excel file export workflow.
- Secret vault/KMS integration.
- Broad runtime feature-flag propagation beyond the current service cache.
