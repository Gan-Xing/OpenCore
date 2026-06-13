# Round 58 Completion Report: core.config Runtime Feature Flags

Date: 2026-06-13
Feature commit:
`b294c35 feat(config): add runtime feature flags / 新增运行时功能开关`
Deployment: API `39172`, Admin `39174`

## Capability

Round 58 adds the first runtime feature-flag stage for `core.config`.
OpenCore now treats `feature.*.enabled` rows as strict public boolean runtime
flags and exposes them through `GET /api/core/config/runtime`.

This is a foundation config-runtime loop, not an advanced rollout or
experimentation product.

## Implemented

- Added `feature.*.enabled` detection and `featureFlag` export metadata.
- Seeded `feature.notice.inbox.enabled=true` as a public boolean system config.
- Enforced public boolean feature-flag shape in seed and Prisma repositories.
- Added runtime `featureFlags` to system config service, DTO, SDK and OpenAPI.
- Extended registry fixtures and tests with feature-flag config coverage.
- Added Admin Config Feature Flag filtering, list/detail/export markers and
  row-level toggles.
- Extended fixed-port/deploy/public `core.config` smoke with feature-flag
  runtime checks, invalid create/update guards and toggle propagation.
- Added a deploy-script guard that rejects stale Admin Config bundles missing
  the Feature Flag UI marker.

## Verification

- `pnpm nx test system --runInBand`
- `pnpm nx test sdk --runInBand`
- `pnpm test:api --runInBand`
- `pnpm test:admin`
- `pnpm openapi:export`
- `pnpm openapi:check`
- `pnpm openapi:registry-tags:check`
- `pnpm sdk:check`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm smoke:api:local`
- `pnpm deploy:opencore`
- `OPENCORE_SMOKE_BASE_URL=http://144.217.243.161:39172 pnpm smoke:core-config`

## Public Verification

- Public API: `http://144.217.243.161:39172`
- Public Admin: `http://144.217.243.161:39174`
- Public config smoke passed with `core.config.runtime-feature-flags` and
  `core.config.runtime-feature-flag-guards`.
- Public runtime returned `featureFlags.notice.inbox=true`.
- Public Admin Config chunk `p__System__Config.892ddef6.async.js` contains
  `Feature Flag`, `Toggle feature flag`, `runtime` and `standard`.

## Remaining Debt

- KMS/secret vault integration remains a separate foundation round.
- Advanced feature-flag rollout such as percentage rules, targeting and
  experimentation remains a separate foundation round.
- Multi-environment rollout governance remains outside this closed stage.
