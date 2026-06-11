# Payment Provider Design

Payment remains design-only in OpenCore cycle 001. The registry uses `integration.billing-design` to avoid admitting a real payment module before the required safety work exists.

## Allowed

- Provider metadata and sandbox/mock configuration.
- Secret references through `secret://`.
- Health checks.
- Documentation for callback, refund, and reconciliation boundaries.
- OpenForge generated Admin pages for billing-design providers must classify
  provider config, secret refs, API keys, client secrets, authorization values,
  callback payloads and reconciliation params as `sensitive` or `detailOnly`
  before list/detail/export rendering.

## Blocked Until Complete

- Real charge creation.
- Real payment callback processing.
- Refund execution.
- Settlement or reconciliation jobs.
- Storing raw card, wallet, or account credentials.

## Required Before Production

- Callback idempotency keys.
- Signed callback verification.
- Replay protection.
- Refund state machine.
- Reconciliation job and mismatch report.
- Audit log for every state transition.
- Sandbox-to-production provider promotion checklist.
