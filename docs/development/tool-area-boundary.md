# System Area Management

OpenCore `system.area` owns the admitted area/IP master-data boundary. It
absorbs the former tool-area dataset governance surface into System Management.

Current scope:

- canonical Admin page at `/system/area`
- hidden `/tools/area` frontend redirect to `/system/area`
- versioned area dataset
- bounded JSON import and validation
- dry-run import and active version switching
- hierarchical region tree, child query, level query and detail lookup
- reusable Admin `AreaCascader`
- path formatting
- IPv4 CIDR/exact range lookup
- SDK and typed smoke coverage
- OpenAPI and deploy bundle guards

Explicit non-goals:

- no GeoIP vendor database redistribution
- no paid/redistributed province-city-county vendor dataset bundled into the
  repository
- no business-domain address book workflow in this capability

The dataset import endpoint defaults to dry-run unless `dryRun: false` is sent
by an authorized caller with `system:area:import`. Stored dataset activation
requires `system:area:manage`.
