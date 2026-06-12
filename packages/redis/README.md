# @opencore/redis

Redis runtime boundary for OpenCore backend packages.

This package owns Redis connection options, a NestJS `RedisModule`,
`RedisService`, cache JSON helpers, key naming and TTL policy utilities. It also
exposes Redis connection options that BullMQ can reuse without importing API
runtime configuration.
