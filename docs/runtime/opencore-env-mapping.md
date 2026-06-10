# OpenCore Env Mapping

更新时间：2026-06-10

本文档是 R0 Runtime audit 的 OpenCore 环境变量映射草案。它描述 OpenCore 应如何从已有服务器基础设施边界进入独立运行时；它不包含真实 secret。

## Principles

- `.env.example` must contain placeholders only.
- `.env.opencore.local` may be created locally in R1, but must remain untracked.
- Do not copy NestWeb `.env` values into OpenCore.
- Use the same infrastructure services only as service boundaries; OpenCore must own its database/schema/user, Redis prefix/DB, BullMQ prefix, and S3 bucket/prefix.
- R0 is read-only. Variable validation and local env template work starts in R1.

## Required Runtime Variables

| Variable                   | Purpose                                                         | Source boundary                                                              | Isolation rule                                                                                                                                          |
| -------------------------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`             | Prisma PostgreSQL connection for OpenCore.                      | Existing PostgreSQL service boundary, with connection target verified in R2. | Must point to OpenCore-owned database/user, or OpenCore-owned schema if database/user creation is unavailable. Never use NestWeb database/schema/table. |
| `REDIS_URL`                | Redis connection for health checks, cache boundary, and BullMQ. | Existing Redis service boundary, with connection target verified in R5.      | Must use OpenCore Redis DB index and/or `REDIS_KEY_PREFIX`. Never reuse NestWeb keys.                                                                   |
| `REDIS_KEY_PREFIX`         | Prefix for all OpenCore Redis keys.                             | OpenCore-owned naming.                                                       | Recommended value: `opencore:`.                                                                                                                         |
| `BULLMQ_QUEUE_PREFIX`      | Prefix for BullMQ queue names and metadata.                     | OpenCore-owned naming on Redis.                                              | Recommended value: `opencore`. Do not use RabbitMQ queue names from NestWeb.                                                                            |
| `S3_ENDPOINT`              | S3-compatible endpoint for MinIO.                               | Existing MinIO service boundary.                                             | Endpoint host/port must be local runtime specific; keep real value out of docs.                                                                         |
| `S3_REGION`                | S3 client region placeholder.                                   | OpenCore config.                                                             | Use a stable placeholder such as `us-east-1` for MinIO unless deployment requires another region.                                                       |
| `S3_BUCKET`                | OpenCore object bucket.                                         | Existing MinIO service boundary.                                             | Must be a bucket owned by OpenCore, not NestWeb's default bucket.                                                                                       |
| `S3_PREFIX`                | Optional OpenCore object key prefix.                            | OpenCore-owned naming.                                                       | Recommended value: `runtime/` when sharing a bucket is unavoidable.                                                                                     |
| `S3_ACCESS_KEY_ID`         | S3 access key id.                                               | Local OpenCore env only.                                                     | Placeholder in `.env.example`; real value only in local secret storage.                                                                                 |
| `S3_SECRET_ACCESS_KEY`     | S3 secret access key.                                           | Local OpenCore env only.                                                     | Placeholder in `.env.example`; never commit.                                                                                                            |
| `S3_FORCE_PATH_STYLE`      | Required by most MinIO clients.                                 | OpenCore config.                                                             | Recommended value: `true` for MinIO.                                                                                                                    |
| `AUTH_TOKEN_SECRET`        | OpenCore auth token signing secret.                             | OpenCore config.                                                             | Must be OpenCore-owned and strong in production. Never use NestWeb JWT secrets.                                                                         |
| `BOOTSTRAP_ADMIN_PASSWORD` | Local seed password for the first OpenCore admin.               | Local OpenCore env only.                                                     | R2 seed must read this or an equivalent one-time input. Never commit a real password.                                                                   |

## Placeholder Template

R1 implemented the following placeholder shape in `.env.example` and generated an ignored local `.env.opencore.local` template.

```dotenv
DATABASE_URL=postgresql://opencore_app:<local-password>@<postgres-host>:5432/opencore?schema=public
REDIS_URL=redis://<redis-host>:6379/<opencore-db-index>
REDIS_KEY_PREFIX=opencore:
BULLMQ_QUEUE_PREFIX=opencore
S3_ENDPOINT=http://<minio-host>:9002
S3_REGION=us-east-1
S3_BUCKET=opencore
S3_PREFIX=runtime/
S3_ACCESS_KEY_ID=<local-opencore-access-key>
S3_SECRET_ACCESS_KEY=<local-opencore-secret-key>
S3_FORCE_PATH_STYLE=true
BOOTSTRAP_ADMIN_PASSWORD=<local-bootstrap-password>
```

All angle-bracket values are placeholders. Do not replace them with real values in committed files.

## Runtime Target Notes

### PostgreSQL

NestWeb's PostgreSQL container is available on the Docker network boundary, but its database and user belong to NestWeb. R2 should create or confirm OpenCore-owned isolation before running migrations.

Preferred R2 outcome:

```text
database: opencore
user: opencore_app
schema: public or opencore
```

Fallback if database/user creation is not permitted:

```text
database: existing infrastructure database
schema: opencore
user: least-privilege OpenCore user when possible
```

### Redis and BullMQ

OpenCore should use Redis for BullMQ and runtime health checks. The minimum isolation boundary is:

```text
REDIS_KEY_PREFIX=opencore:
BULLMQ_QUEUE_PREFIX=opencore
```

Using a separate Redis DB index is acceptable only after verifying it does not conflict with existing services.

### MinIO/S3

OpenCore file metadata can point to MinIO/S3 only after R5. R1 should define the variables, while R5 should verify the bucket/prefix boundary and health check behavior.

Preferred isolation:

```text
S3_BUCKET=opencore
S3_PREFIX=runtime/
```

Fallback:

```text
S3_BUCKET=<shared-bucket>
S3_PREFIX=opencore/runtime/
```

The fallback is allowed only if creating a dedicated bucket is not available.

## R1 Result

R1 completed:

1. `.env.example` contains placeholders for the variables above.
2. Runtime config validation fails fast for dangerous production defaults.
3. `docs/runtime/local-env-runbook.md` documents local `.env.opencore.local` usage.
4. `.env.opencore.local` was generated locally with placeholders and remains ignored.
5. NestWeb variable names remain historical audit references only, not OpenCore production config names.
