# Round 62 Completion Report: core.config Secret Vault

Date: 2026-06-13
Feature commit:
`2e1e927 feat(config): encrypt secret config values / 加密配置密钥值`
Deployment: API `39172`, Admin `39174`

## Scope

Round 62 productized the first at-rest secret vault stage for `core.config`.
OpenCore now stores `visibility=secret` config values as versioned encrypted
envelopes, keeps API/Admin/export responses redacted and exposes an
`encrypted` status so operators can identify vault-backed rows without seeing
secret material.

This round stayed inside the System Config foundation boundary. It did not add
external KMS/HSM provider binding, key rotation, re-encryption jobs, secret
version history, secret access timelines or advanced feature-flag rollout.

## Delivered

- `system-config.vault` AES-256-GCM envelope encryption with config-key AAD
  binding and deployment-secret-derived local key material.
- Central storage helpers for secret shape validation, stored-value
  normalization, existing-value decryption and encrypted-state detection.
- Prisma and seed repository paths that store secret configs as
  `opencore:vault:v1:*` envelopes while preserving normalized plaintext for
  public/private configs.
- Seeded built-in `auth.jwt.secretRef` secret reference and `prisma/seed.ts`
  routing through the same vault storage helper.
- API DTO, SDK types, registry fixtures and OpenAPI `encrypted` propagation.
- Admin Config `Vault encrypted` list/detail/export/filter surface.
- Admin static smoke and deploy-script stale bundle guards for the Config
  vault markers.
- `smoke-core-config` database plaintext guard for seeded and temporary secret
  configs, including no plaintext storage and non-string secret value
  rejection.

## Verification

- Standard round gates passed; repeated command transcripts were removed during docs compaction.

Public deployment:

- API: `http://144.217.243.161:39172`
- Admin: `http://144.217.243.161:39174`
- Admin main bundle: `umi.9bba20bc.js`
- System Config chunk: `p__System__Config.17151e5f.async.js`

Public Admin bundle verification proved these deployed markers:

- `Vault encrypted`
- `Legacy secret`
- `encrypted`

## Smoke Evidence

`tools/scripts/smoke-core-config.mjs` now verifies:

- `core.config.seed-secret-vault`
- `core.config.secret-redaction`
- `core.config.secret-value-blocked`
- `core.config.secret-vault-encrypted`
- `core.config.secret-value-type-guard`

The public smoke read PostgreSQL through the configured Prisma Pg adapter and
proved the temporary secret row is stored as an `opencore:vault:v1:` envelope
without the plaintext `super-secret-smoke-value`.

## Remaining Config Debt

- Advanced feature-flag rollout such as percentage rules, audience targeting
  and experimentation UI.
- External KMS/HSM provider binding.
- Key rotation and re-encryption jobs.
- Secret version history and secret access audit timelines.

These remain separate foundation/security hardening stages and are not hidden
inside Round 62.
