# Runtime Inventory

更新时间：2026-06-10

本文档是 R0 Runtime audit 的脱敏记录，用于把 OpenCore 接入真实运行时基础设施前，明确服务器上可复用的基础服务边界。

## Scope

- Evidence sources: Docker public metadata, NestWeb package/compose metadata, and NestWeb `.env` variable names/existence.
- No database, Redis, RabbitMQ, or MinIO connection was opened in R0.
- No container, volume, bucket, network, database, schema, table, Redis key, or queue was deleted or modified.
- No real password, token, access key, JWT secret, database URL, Redis URL, RabbitMQ URL, or MinIO secret is recorded here.

## Legacy Freeze State

R-1 froze old application runtime before this audit:

| Runtime                   | State after R-1 | Notes                                                           |
| ------------------------- | --------------- | --------------------------------------------------------------- |
| `antdpro6-frontend`       | stopped         | Application container only; no volume deletion.                 |
| `nestweb-api`             | stopped         | Application container only; no database/service deletion.       |
| Host NestWeb Node process | stopped         | Exact NestWeb PID was targeted; no broad process kill was used. |

Data and service containers remain running.

## Service Inventory

| Service    | Existing runtime     | Provider/image           | Network/port boundary                                                                                                       | R0 decision                                                                                                                                                                                                  |
| ---------- | -------------------- | ------------------------ | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| PostgreSQL | `nestweb-postgres`   | `pgvector/pgvector:pg17` | Docker network `nestweb_default`, internal port `5432`; no host port is published by this container.                        | Reuse service boundary only. R2 must create or confirm an independent OpenCore database/user, or an isolated schema if permissions are insufficient. Do not reuse NestWeb database, schema, tables, or data. |
| Redis      | `nestweb-redis`      | `redis:7.2-alpine`       | Docker network `nestweb_default`, internal port `6379`; no host port is published by this container.                        | Reuse service boundary only. OpenCore must use its own DB index and/or `opencore:` key prefix. Do not reuse NestWeb Redis keys.                                                                              |
| MinIO/S3   | `nestweb-minio`      | `minio/minio:latest`     | Internal API `minio:9000`; host API port `9002`; host console port `9003`. External host values are intentionally redacted. | Reuse service boundary only. OpenCore must create its own bucket or prefix and must not reuse the NestWeb default bucket/path.                                                                               |
| RabbitMQ   | `nestweb-rabbitmq`   | `rabbitmq:3-management`  | Internal AMQP `rabbitmq:5672`; host AMQP port `5673`; management port `15673`.                                              | Preserve for legacy infrastructure. OpenCore R5 targets BullMQ on Redis, not RabbitMQ, unless a later handoff explicitly changes scope.                                                                      |
| Prometheus | `nestweb-prometheus` | `prom/prometheus:latest` | Host port `9091`.                                                                                                           | Preserve as an existing monitoring service. Not required for R0-R7 runtime integration.                                                                                                                      |
| Grafana    | `nestweb-grafana`    | `grafana/grafana:latest` | Host port `3300`.                                                                                                           | Preserve as an existing monitoring UI. Not required for R0-R7 runtime integration.                                                                                                                           |

Important host-port note: the host already has another PostgreSQL listener on `localhost:5432` from a non-NestWeb container. R2 must not assume `localhost:5432` is the NestWeb PostgreSQL service without verifying the connection target.

## Preserved Docker Assets

| Asset type | Names observed                                                                                                                                  | R0 action                                                          |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Volumes    | `nestweb_postgres_data`, `nestweb_redis_data`, `nestweb_minio_data`, `nestweb_rabbitmq_data`, `nestweb_prometheus_data`, `nestweb_grafana_data` | Preserved.                                                         |
| Network    | `nestweb_default`                                                                                                                               | Preserved.                                                         |
| Buckets    | NestWeb default bucket exists by env variable, exact value redacted.                                                                            | Preserved; OpenCore must create a separate bucket or prefix later. |

## NestWeb Env Variable Inventory

Only variable names and existence were recorded from `/home/ubuntu/dev/NestWeb/.env`.

| Area                   | Variables observed                                                                                                                                                                                                   | R0 interpretation                                                                                                                                         |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PostgreSQL             | `DATABASE_URL`, `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`                                                                                                                                                  | Existing NestWeb database settings are present. Values must not be copied into OpenCore.                                                                  |
| Redis                  | `REDIS_CLIENTS`, `REDIS_HOST_DEFAULT`, `REDIS_PORT_DEFAULT`, `REDIS_DB_DEFAULT`, `REDIS_PASSWORD_DEFAULT`                                                                                                            | Existing Redis settings are present. Password variable is defined but had no value during audit. OpenCore still needs an explicit key prefix/DB boundary. |
| RabbitMQ               | `RABBITMQ_URI`, `RABBITMQ_USER`, `RABBITMQ_PASSWORD`                                                                                                                                                                 | Existing RabbitMQ settings are present. Preserve but do not use for BullMQ unless scope changes.                                                          |
| MinIO/S3               | `MINIO_ENDPOINT`, `MINIO_INTERNAL_ENDPOINT`, `MINIO_INTERNAL_PORT`, `MINIO_INTERNAL_USE_SSL`, `MINIO_PUBLIC_URL`, `MINIO_DEFAULT_BUCKET`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `OSS_CDN_URL`                      | Existing MinIO settings are present. OpenCore needs its own bucket/prefix and credentials mapping.                                                        |
| API/security           | `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `CORS_ORIGINS`, `SWAGGER_ENABLED`, `METRICS_PUBLIC`                                                                                                                       | Existing NestWeb app runtime settings are present. OpenCore must keep its own token secrets and CORS config.                                              |
| Mail/cloud/miniprogram | `MAIL_HOST`, `MAIL_PORT`, `MAIL_USER`, `MAIL_PASSWORD`, `MAIL_FROM`, `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `ALIBABA_CLOUD_ACCESS_KEY_ID`, `ALIBABA_CLOUD_ACCESS_KEY_SECRET`, `MINIPROGRAM_APPID`, `MINIPROGRAM_SECRET` | Out of scope for R0-R7. Do not copy into OpenCore core runtime.                                                                                           |
| Admin bootstrap        | `ADMIN_EMAIL`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`                                                                                                                                                                    | NestWeb bootstrap variables exist. OpenCore seed must use its own local bootstrap values later.                                                           |

## NestWeb Runtime Capabilities Observed

Package and source metadata show NestWeb uses:

- PostgreSQL through Prisma.
- Redis through `ioredis`.
- Bull queue integration through `@nestjs/bull` / `bull`.
- RabbitMQ through `@golevelup/nestjs-rabbitmq` / `amqplib`.
- MinIO through the `minio` client.
- Prometheus metrics through `prom-client` and NestJS Prometheus integration.

OpenCore must use these only as infrastructure experience and service-boundary references. It must not migrate NestWeb business data or copy NestWeb business modules.

## OpenCore Runtime Plan From R0

| Runtime dependency | OpenCore isolation requirement                                                                                                 | Earliest stage |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------ | -------------- |
| PostgreSQL         | Prefer independent database and user. If permissions are insufficient, use an isolated schema with OpenCore-owned tables only. | R2             |
| Redis              | Use `REDIS_KEY_PREFIX=opencore:` and/or a dedicated DB index.                                                                  | R1/R5          |
| BullMQ             | Use Redis-backed BullMQ with `BULLMQ_QUEUE_PREFIX=opencore`. Do not use NestWeb RabbitMQ queues.                               | R1/R5          |
| MinIO/S3           | Use an independent bucket or prefix, for example `opencore` bucket plus `runtime/` prefix.                                     | R1/R5          |
| Local env          | Use `.env.opencore.local` locally and keep it untracked. `.env.example` must contain placeholders only.                        | R1             |

## R0 Exit Conclusion

OpenCore can reuse the existing server's infrastructure boundary, but must create its own database/schema/user, Redis key/DB boundary, BullMQ prefix, and S3 bucket/prefix. R0 did not connect to or mutate any data service.
