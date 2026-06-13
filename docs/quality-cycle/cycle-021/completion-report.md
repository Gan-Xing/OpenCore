# cycle-021 Completion Report

Date: 2026-06-13

## Latest Completed Round

Round 80: `integration.mail` SMTP TLS policy.

## Closed

- Replaced ambiguous SMTP TLS booleans with explicit `tlsMode` policy values.
- SMTP adapter rejects deprecated `secure`/`requireTls`/`startTls` config and
  maps `tlsMode` to Nodemailer `secure`/`requireTLS`/`ignoreTLS`.
- SDK/Admin/OpenAPI fixtures and deploy bundle guards expose the policy.
- Notice smoke verifies STARTTLS-required degradation and plain SMTP delivery.

## Still Open

- Notice still needs realtime push.
