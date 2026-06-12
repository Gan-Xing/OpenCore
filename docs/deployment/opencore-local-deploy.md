# OpenCore Local Server Deploy

This repository now has a scripted local-server deployment path. Use it after
code changes instead of choosing ports by hand.

## Fixed Ports

- API smoke server: `39173`
- Deployed API: `39172`
- Deployed Admin: `39174`

The scripts do not auto-select alternate ports. If one of these fixed ports is
occupied, the command fails with the specific port to free or override.

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
build on port `39174`, then runs the same authenticated config smoke against
the deployed API.

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
