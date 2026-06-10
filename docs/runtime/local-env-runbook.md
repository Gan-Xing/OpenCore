# Local Runtime Env Runbook

更新时间：2026-06-10

本文档说明 R1 Env mapping 后如何准备 OpenCore 本地运行时环境。本文档只使用占位符，不包含真实 secret。

## Files

| File                            | Commit status        | Purpose                                                           |
| ------------------------------- | -------------------- | ----------------------------------------------------------------- |
| `.env.example`                  | committed            | Placeholder-only runtime variable contract.                       |
| `.env.opencore.local`           | ignored              | Local developer/server values for OpenCore runtime. Never commit. |
| `/home/ubuntu/dev/NestWeb/.env` | external legacy file | R0 audit source only. Do not copy values into OpenCore.           |

The repository `.gitignore` already ignores `.env.*` while allowing `.env.example`.

## Create Local Env

Create or refresh the local template from the committed placeholder contract:

```bash
cp .env.example .env.opencore.local
```

Then edit `.env.opencore.local` locally and replace every placeholder with OpenCore-owned values.

Do not commit `.env.opencore.local`.

## Required Isolation

| Runtime    | Required OpenCore boundary                                                                 |
| ---------- | ------------------------------------------------------------------------------------------ |
| PostgreSQL | OpenCore-owned database/user, or isolated schema if database/user creation is unavailable. |
| Redis      | `REDIS_KEY_PREFIX=opencore:` and/or a dedicated Redis DB index.                            |
| BullMQ     | `BULLMQ_QUEUE_PREFIX=opencore`.                                                            |
| MinIO/S3   | OpenCore-owned bucket, or OpenCore-owned prefix if a shared bucket is unavoidable.         |
| Auth       | OpenCore-owned `AUTH_TOKEN_SECRET`; do not reuse NestWeb JWT secrets.                      |
| Seed       | Local-only `BOOTSTRAP_ADMIN_PASSWORD`; do not commit a real password.                      |

## Production Fail-fast Rules

`apps/api` runtime config now fails fast in production when:

- `CORS_ORIGINS` is missing or includes `*`.
- Swagger is exposed without `API_SWAGGER_PUBLIC_ACK=true`.
- `AUTH_TOKEN_SECRET` is shorter than 32 characters.
- `DATABASE_URL`, `REDIS_URL`, `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, or `S3_SECRET_ACCESS_KEY` is missing.
- Runtime variables still contain placeholder markers such as angle brackets, `change-me`, or local placeholder text.
- `REDIS_KEY_PREFIX`, `BULLMQ_QUEUE_PREFIX`, `S3_BUCKET`, or `S3_PREFIX` reuses a NestWeb name.

## R2 Handoff Notes

R2 must verify the actual PostgreSQL target before creating OpenCore database/schema/user. R0 observed that `nestweb-postgres` is exposed inside Docker network `nestweb_default`, while host `localhost:5432` is occupied by another PostgreSQL container.

R2 must not run Prisma migrate against a NestWeb business database/schema.
