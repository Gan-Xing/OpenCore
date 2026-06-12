# @opencore/common

Framework-agnostic backend primitives shared by OpenCore runtime packages.

This package intentionally has no NestJS, Prisma, Redis, or browser dependency.
Higher-level packages can rely on it for stable response contracts, error code
normalization, pagination, bounded filter parsing, request header constants, and
small runtime guards.
