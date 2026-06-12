# OpenCore Local Server Deploy

This repository now has a scripted local-server deployment path. Use it after
code changes instead of choosing ports by hand.

## Fixed Ports

- API smoke server: `39173`
- Deployed API: `39172`
- Deployed Admin: `39174`

The scripts do not auto-select alternate ports. If one of these fixed ports is
occupied, the command fails with the specific port to free or override.

Admin listens on `0.0.0.0` by default and the Admin build uses the detected
server address for `ADMIN_API_BASE_URL`, so a browser outside the server can
open the deployed UI. `ADMIN_API_BASE_URL` must be the API origin without
`/api`, because the Admin SDK request helper prefixes `/api` itself. Override
`OPENCORE_DEPLOY_PUBLIC_HOST` when the detected address is not the public
address you want to use. The deploy script refuses to continue if the built
Admin JavaScript does not contain that API base URL, or if the configured value
ends with `/api`.

The Admin static server also proxies `/api/*` to the deployed API. This keeps
login and authenticated requests working even if a browser tries the same-origin
Admin `/api` path, and prevents the static server from returning `405 Method Not
Allowed` for API POST requests. It also normalizes stale `/api/api/*` requests
from old browser tabs to `/api/*`, so an old login bundle can still authenticate
while the new bundle is being deployed.

The deploy script skips Nx cache for the Admin build because the browser bundle
depends on `ADMIN_API_BASE_URL`. Reusing a normal `pnpm build` Admin cache can
produce a bundle without the deploy API origin and will be rejected by the
bundle guard.

All Admin HTML route files are served with `no-cache`, while hashed JavaScript
and CSS assets remain immutable. This prevents browsers from holding an old
route HTML file that points at an obsolete frontend bundle after deployment.
Runtime manifests, public scripts and the retired `/service-worker.js` endpoint
are also served without long-lived caching. `/service-worker.js` intentionally
unregisters stale Workbox service workers and clears their caches.

## Commands

```bash
pnpm smoke:api:local
pnpm deploy:opencore
```

`pnpm smoke:api:local` starts a temporary API on port `39173`, loads
`.env.opencore.local` without printing secrets, refreshes local seed data for a
known smoke login, runs authenticated config CRUD checks, then stops the
temporary API.

`pnpm deploy:opencore` builds the API and Admin, applies Prisma migrations,
refreshes local seed data, restarts the API on port `39172`, serves the Admin
build on port `39174`, then runs authenticated config and file metadata smoke
checks, an Admin `/api/auth/login` proxy smoke check, operation-log audit smoke
and login-log audit smoke, plus online-user list/detail/kick-out smoke against
the deployed API. The deploy script also fetches the public Admin login HTML,
current `umi.*.js` bundle and retired service worker endpoint after startup, so
deployment fails if the live frontend would still emit `/api/api/auth/login`.

Admin production builds deliberately force the stable Umi webpack path. Do not
enable `FORCE_UTOOPACK` for OpenCore deploys; the project has repeatedly hit
`utoopack` CSS loader deserialization failures on `global.less.css`.

## Environment

The scripts read `.env.opencore.local` by default. Override with:

```bash
OPENCORE_ENV_FILE=/path/to/env pnpm deploy:opencore
```

Optional overrides:

```bash
OPENCORE_SMOKE_PORT=39173
OPENCORE_DEPLOY_API_PORT=39172
OPENCORE_DEPLOY_ADMIN_PORT=39174
OPENCORE_DEPLOY_PUBLIC_HOST=144.217.243.161
OPENCORE_DEPLOY_ADMIN_HOST=0.0.0.0
OPENCORE_DEPLOY_ADMIN_API_BASE_URL=http://144.217.243.161:39172
OPENCORE_SMOKE_SEED=true
OPENCORE_DEPLOY_SEED=true
OPENCORE_DEPLOY_NODE_ENV=development
OPENCORE_ADMIN_BUNDLER=webpack
OPENCORE_SMOKE_ADMIN_USERNAME=admin
OPENCORE_SMOKE_ADMIN_PASSWORD=...
```

Secrets must stay in the environment file or process environment. Do not commit
real passwords, tokens, database URLs, or access keys.

## Runtime Files

Deployment PID files and logs are written under `.opencore/run/`, which is
ignored by git:

- `.opencore/run/opencore-api.pid`
- `.opencore/run/opencore-admin.pid`
- `.opencore/run/opencore-api.log`
- `.opencore/run/opencore-admin.log`

Re-running `pnpm deploy:opencore` stops only the processes referenced by these
PID files, then starts the new build.
