# Round 65 Completion Report: core.config Feature Flag Audience

Feature+docs commit:
`f55c8f3 feat(config): target feature flags by audience / 按受众规则定位功能开关`

## Summary

Round 65 productizes the next `core.config` feature-flag stage after percentage
rollout: bounded audience targeting. OpenCore now supports public json
`feature.*.audienceRules`, exposes those rules through runtime config and
evaluates them with subject attributes before applying rollout percentage.

This is a deployable feature-control foundation, not a full experimentation
platform.

## Delivered

- Added `json` config value type support across API, repository normalization,
  SDK types, registry fixtures and OpenAPI.
- Added public json `feature.*.audienceRules` shape with strict guards for
  visibility, type, json object structure, `all/any` mode, supported operators
  and bounded values.
- Seeded `feature.notice.inbox.audienceRules={"mode":"all","rules":[]}`.
- Extended `GET /api/core/config/runtime` `featureFlagRules` with
  `audienceRules`.
- Extended `GET /api/core/config/feature-flags/evaluate` with `attributes`,
  `audienceMatched` and `audience-mismatch`.
- Updated SDK `evaluateFeatureFlag` to accept primitive attributes.
- Added Admin Config `Audience Rules` column, feature audience row labeling,
  detail/export support and `Set audience` modal.
- Extended fixed-port smoke, Admin static smoke and deploy stale-bundle guards.

## Verification

- Standard round gates passed; repeated command transcripts were removed during docs compaction.

The first local smoke run found a smoke assertion ordering issue: the
zero-rollout check evaluated a targeted flag without matching attributes and
therefore received the correct `audience-mismatch` reason. The smoke now passes
matching attributes when it is specifically asserting `outside-rollout`.

`pnpm lint` passed with the pre-existing warnings in
`packages/system/src/system-user/system-user.prisma-repository.ts` and
`apps/admin/src/pages/shared/CurrentPageExportButton.tsx`.

## Public Verification

Against public endpoints after `pnpm deploy:opencore`:

- Public API: `http://144.217.243.161:39172`
- Public Admin: `http://144.217.243.161:39174`
- Admin main bundle: `umi.233257ee.js`
- System Config chunk: `p__System__Config.8e49d80f.async.js`
- Public API config smoke:
  `OPENCORE_SMOKE_BASE_URL=http://144.217.243.161:39172 pnpm smoke:core-config`
- Public API config smoke included
  `core.config.runtime-feature-flag-audience`, runtime propagation,
  attribute-aware evaluate behavior, bad audience guards and export metadata.
- Public System Config chunk contains `Audience Rules`, `Set audience` and
  `Feature audience`.
- Public OpenAPI docs contain `/api/core/config/feature-flags/evaluate`,
  `audienceRules`, `audienceMatched`, `audience-mismatch` and json config value
  type.

## Out Of Scope

- Multi-environment rollout approval/governance.
- AB experiment metrics and analytics.
- Full experimentation UI.
- General-purpose nested rule expressions or segment builders.
- External KMS/HSM provider binding, key rotation or secret version history.
