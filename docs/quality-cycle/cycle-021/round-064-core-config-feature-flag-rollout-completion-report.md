# Round 64 Completion Report: core.config Feature Flag Rollout

Date: 2026-06-13

Feature+docs commit:
`719c4ce feat(config): evaluate feature flag rollouts / 评估功能开关灰度比例`

## Scope

Round 64 productized percentage rollout for `core.config` runtime feature
flags. Round 58 made public boolean `feature.*.enabled` flags available at
runtime; this round adds typed rollout percentage rules and deterministic
public evaluation before audience targeting or a full experimentation platform
is admitted.

## Delivered

- Added public numeric `feature.*.rolloutPercentage` config semantics with
  strict repository guards for public visibility, number type and integer
  `0..100` values.
- Seeded `feature.notice.inbox.rolloutPercentage=100`.
- Extended runtime config with `featureFlagRules` while preserving
  `featureFlags`.
- Added public deterministic evaluation API
  `GET /api/core/config/feature-flags/evaluate`.
- Returned stable bucket, enabled result, rollout percentage and reason for
  feature flag evaluation.
- Updated DTOs, SDK types/client/spec, registry fixtures and OpenAPI snapshot.
- Added Admin Config `Rollout %` column, rollout row tagging, detail/export
  support and `Set rollout` modal.
- Extended fixed-port, deploy and public smoke coverage for rollout rules,
  evaluate API, dynamic rollout updates, disabled rollout behavior and bad
  shape guards.
- Extended Admin static smoke and deploy-script stale Config bundle guards for
  rollout UI markers.

## Verification

- Standard round gates passed; repeated command transcripts were removed during docs compaction.

`pnpm smoke:api:local` passed on fixed port `39173`, including
`core.config.runtime-feature-flag-rules`,
`core.config.runtime-feature-flag-evaluate` and
`core.config.runtime-feature-flag-rollout`.

`pnpm lint` passed with existing warnings in
`packages/system/src/system-user/system-user.prisma-repository.ts` and
`apps/admin/src/pages/shared/CurrentPageExportButton.tsx`; no Round 64 lint
errors were introduced.

`pnpm deploy:opencore` passed, deploying API/Admin on fixed ports
`39172`/`39174`; deploy smoke included Admin same-origin login,
duplicate-prefix login compatibility, public bundle checks, stale
service-worker retirement and the new config feature-rollout smoke checks.

## Public Verification

- Public API: `http://144.217.243.161:39172`
- Public Admin: `http://144.217.243.161:39174`
- Admin main bundle: `umi.c5667446.js`
- System Config chunk: `p__System__Config.328ad703.async.js`
- Public `smoke:core-config` passed against
  `http://144.217.243.161:39172`.
- Public Admin Config chunk contains `Rollout %`, `Set rollout` and
  `Feature rollout`.
- Public OpenAPI docs contain `/api/core/config/feature-flags/evaluate`,
  `featureFlagRules` and `SystemConfigFeatureFlagEvaluationDto`.

## Smoke Evidence

The config smoke now proves:

- seeded `feature.notice.inbox.rolloutPercentage=100` is public number system
  config;
- runtime `featureFlagRules.notice.inbox` exposes enabled state and rollout
  percentage;
- public feature evaluation returns deterministic bucket, enabled state and
  reason;
- malformed flag names, empty subject keys and missing flags are rejected;
- invalid rollout create/update shapes are rejected;
- dynamic rollout changes update runtime rules and evaluation results;
- disabled flags globally return disabled evaluation even when rollout exists;
- export payload contains rollout metadata.

## Remaining Config Debt

- Feature-flag audience targeting rules.
- Multi-environment rollout governance and approval.
- AB experiment metrics and analytics.
- Full experimentation UI.
- External KMS/HSM provider binding, key rotation and secret version history.
