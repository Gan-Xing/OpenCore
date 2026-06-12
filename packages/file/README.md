# @opencore/file

OpenCore backend file-storage boundary.

This package owns reusable file primitives for higher modules:

- safe file asset validation and deterministic object-key creation;
- storage abstraction shared by local development storage and MinIO/S3 object storage;
- NestJS provider module for storage injection;
- read-only object-storage prefix probe for monitor diagnostics.

`apps/api` should not create MinIO clients or local-storage paths directly. It
should consume this package and keep HTTP/controller aggregation in the app.
