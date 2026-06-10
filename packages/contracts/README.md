# @opencore/contracts

S3 contract source for OpenCore package and application boundaries.

Current scope:

- permission code format: `<module>:<resource>:<action>`;
- module, menu, and permission schema types;
- runtime validators for S3 registry checks;
- OpenAPI export and SDK generation protocol metadata.

The OpenAPI protocol is intentionally metadata-only in S3. API export and SDK
generation become executable in later stages, after the API foundation is
expanded.
