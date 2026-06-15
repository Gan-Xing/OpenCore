# Tool Area Boundary

OpenCore `tool.area` owns the admitted area/IP data boundary.

Current scope:

- versioned in-process area dataset
- bounded JSON import and validation
- hierarchical region query and detail lookup
- IPv4 CIDR/exact range lookup
- Admin live page at `/tools/area`
- SDK and typed smoke coverage

Explicit non-goals:

- no full administrative division operations platform
- no bulk province/city/county curation workflow
- no GeoIP vendor database redistribution
- no database migration in this loop

The dataset import endpoint defaults to dry-run unless `dryRun: false` is sent
by an authorized caller with `tool:area:import`.
