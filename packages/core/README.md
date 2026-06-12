# @opencore/core

NestJS runtime foundation for OpenCore backend packages.

This package depends on `@opencore/common` for framework-neutral primitives and
keeps Nest-specific concerns out of `apps/api`: request context, exception
filtering, response wrapping helpers, security headers, OpenAPI helpers and API
foundation setup.
