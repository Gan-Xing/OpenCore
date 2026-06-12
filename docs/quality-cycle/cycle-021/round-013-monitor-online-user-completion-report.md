# Cycle-021 Round 13 Completion Report: monitor.online-user

Date: 2026-06-12  
Feature commit:
`0381de1 feat(monitor-online-user): productize online sessions / 产品化在线会话管理`

## Capability

`monitor.online-user` is now a live productized Admin loop. Operators can list
online sessions, inspect details, export the current filtered page and kick out
a non-admin session when they have `monitor:online-user:manage`.

## Reference Comparison

RuoYi exposes online users under Monitor with list filters and row-level force
logout. Yudao exposes a comparable operational shape through OAuth2 token
listing and delete/logout actions. OpenCore admitted the shared minimum:
session list, detail and force logout against its existing package-owned
online-session model.

## Implemented

- Added a dedicated `session_operator` seed record so smoke can test kick-out
  without revoking `session_admin`.
- Updated online-user tests, operations summary tests and SDK fixtures for the
  two-session seed state.
- Wired online-user list/detail/kick-out into the Admin platform service.
- Added `canManageOnlineUsers` access binding.
- Replaced the fixture-only `/monitor/online-users` page with a live page using
  current-page filters/export, detail drawer and permission-gated kick-out.
- Added `tools/scripts/smoke-core-online-user.mjs` and wired it into local and
  deploy smoke scripts.
- Hardened Admin static serving by retiring stale service workers, avoiding
  long-lived caching for runtime files and normalizing stale `/api/api/*`
  proxy requests.
- Hardened deploy with public Admin login page, bundle and retired service
  worker checks after startup.

## Verification

- `pnpm test:admin`
- Temporary Admin static runtime check: `/service-worker.js` no-store retire
  script, `/api/auth/login` 201 and `/api/api/auth/login` 201 through proxy.
- Full gate:
  `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test &&
pnpm openapi:export && pnpm openapi:check && pnpm sdk:check &&
pnpm openapi:registry-tags:check && pnpm registry:admin-routes:check &&
pnpm smoke:api:local && pnpm build && pnpm prisma:validate`

## Scope Held

This round did not add OAuth client/token administration, JWT blacklist
enforcement, browser/OS parsing, IP geolocation, batch kick-out, server-side
date filters or online-user export endpoint expansion.
