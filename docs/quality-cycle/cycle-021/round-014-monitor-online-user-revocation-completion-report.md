# Cycle-021 Round 14 Completion Report: monitor.online-user Revocation

Date: 2026-06-12  
Feature commit:
`688b665 feat(monitor-online-user): enforce session revocation / 强制在线会话撤销生效`

## Capability

`monitor.online-user` now performs real session revocation. Operators can
identify active sessions, select one or more rows, kick them out and rely on
bearer authentication to reject the revoked token on the next protected
request.

## Reference Comparison

RuoYi online-user force logout and Yudao OAuth2 token deletion both make the
selected session/token stop working. OpenCore now admits the same security
effect through its online-session store instead of adding a separate OAuth
token management product.

## Implemented

- Added token IDs and expiry metadata to security bearer tokens.
- Registered successful logins as online-user sessions.
- Made bearer authentication reject revoked and expired online sessions.
- Added batch online-user kick-out API and SDK/Admin support.
- Added browser/OS fields from user-agent parsing.
- Extended Admin Online Users with browser/OS columns, detail/export fields and
  selected-row batch kick-out.
- Extended smoke to prove a kicked real token receives 401.

## Verification

- `pnpm format:check`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm prisma:validate`
- `pnpm test:api`
- `pnpm test:admin`
- `pnpm openapi:export`
- `pnpm openapi:check`
- `pnpm openapi:registry-tags:check`
- `pnpm registry:admin-routes:check`
- `pnpm sdk:check`
- `pnpm smoke:api:local`
- `pnpm deploy:opencore`
- Public verification against `http://144.217.243.161:39172` and
  `http://144.217.243.161:39174`.

## Public Result

The public API accepted login, listed the second active admin session by token
ID, batch-kicked that session and then rejected the kicked token on
`/api/auth/me` with 401. The public Admin login page and online-user page both
returned 200.

## Scope Held

This round did not add OAuth client administration, a standalone JWT blacklist
separate from the online-session store, IP geolocation/location enrichment,
server-side date filters or a dedicated online-user export endpoint.
