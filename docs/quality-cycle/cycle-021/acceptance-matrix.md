# cycle-021 Acceptance Matrix

Date: 2026-06-14

This matrix is the Capstone Acceptance snapshot for admitted Cycle-021
foundation capabilities. It separates runtime/API completion from Admin
live-only completion so fixture-backed pages are visible debt instead of being
counted as fully accepted.

Legend:

- `yes`: accepted at the current waterline.
- `partial`: coverage exists, but the row still has a known gap.
- `no`: not accepted at the current waterline.
- `n/a`: not required for this capability.
- `Public API smoke` means a real request to the public API URL succeeds.
- `Public Admin smoke` means a real request to the public Admin URL succeeds
  for the relevant page or runtime surface.
- `Bundle marker smoke` checks built Admin chunks for required/forbidden
  markers; it is not a substitute for public API/Admin smoke.
- Printing or linking a public URL is not public verification.

| Capability | API live | SDK live | Admin live-only | Permission/Menu | Seed/Migration | OpenAPI | Local smoke | Public API smoke | Public Admin smoke | Bundle marker smoke | Deploy guard | Remaining debt | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `core.permission` | yes | yes | yes | yes | yes | yes | yes | yes | yes | yes | yes | None. | Meets |
| `core.dept` | yes | yes | yes | yes | yes | yes | yes | yes | yes | yes | yes | None. | Meets |
| `core.post` | yes | yes | yes | yes | yes | yes | yes | yes | yes | yes | yes | None. | Meets |
| `core.menu` | yes | yes | yes | yes | yes | yes | yes | yes | yes | yes | yes | None. | Meets |
| `core.role` | yes | yes | no | yes | yes | yes | yes | yes | no | partial | partial | Remove Roles Admin permission/dept fixture fallback and add stale-bundle guards. | Partial |
| `core.user` | yes | yes | no | yes | yes | yes | yes | yes | no | partial | partial | Remove Users Admin role/dept/post fixture fallback and add stale-bundle guards. | Partial |
| `core.dict` | yes | yes | yes | yes | yes | yes | yes | yes | yes | yes | yes | None. | Meets |
| `core.file` | yes | yes | no | yes | yes | yes | yes | yes | no | partial | partial | Remove Files Admin fixture fallback and add live-only deploy guards. | Partial |
| `core.config` | yes | yes | no | yes | yes | yes | yes | yes | no | partial | partial | Remove Config Admin fixture fallback; keep runtime governance/KMS guards current. | Enhance |
| `core.notice` | yes | yes | no | yes | yes | yes | yes | yes | no | partial | partial | Remove System Notices Admin fixture fallback; provider fleet expansion remains explicit admission. | Enhance |
| `core.login-log` | yes | yes | yes | yes | yes | yes | yes | yes | yes | yes | yes | Historical GeoIP backfill remains outside current request-time lookup. | Meets current |
| `core.audit-log` | yes | yes | yes | yes | yes | yes | yes | yes | yes | yes | yes | None. | Meets current |
| `monitor.online-user` | yes | yes | yes | yes | yes | yes | yes | yes | yes | yes | yes | None. | Meets |
| `security.token-session` | yes | yes | yes | yes | yes | yes | yes | yes | yes | yes | yes | None. | Meets current |
| `integration.ip-location` | yes | yes | yes | yes | n/a | yes | yes | yes | yes | yes | yes | Historical log backfill remains outside current request-time lookup. | Meets current |
| `integration.providers` | yes | yes | yes | yes | yes | yes | yes | yes | yes | yes | yes | None. | Meets current |
| `integration.oauth-token` | yes | yes | yes | yes | yes | yes | yes | yes | yes | yes | yes | Full third-party SSO provider flows remain explicit admission. | Meets current |
| `integration.mail` | yes | yes | yes | yes | yes | yes | yes | yes | yes | yes | yes | Broader external provider fleet remains explicit admission. | Meets current |
| `integration.sms` | yes | yes | yes | yes | yes | yes | yes | yes | yes | yes | yes | Broader external provider fleet remains explicit admission. | Meets current |
| `integration.wechat-websocket-design` | yes | yes | yes | yes | n/a | yes | yes | yes | yes | yes | yes | Design-only boundary; real provider/product flows remain explicit admission. | Meets current |
| `scheduler.monitor-jobs` | yes | yes | yes | yes | yes | yes | yes | yes | yes | yes | yes | None. | Meets current |
| `monitor.queue` | yes | yes | yes | yes | n/a | yes | yes | yes | yes | yes | yes | None. | Meets current |
| `monitor.status` | yes | yes | yes | yes | n/a | yes | yes | yes | yes | yes | yes | None. | Meets current |
| `monitor.cache` | yes | yes | yes | yes | n/a | yes | yes | yes | yes | yes | yes | None. | Meets current |
| `monitor.version` | yes | yes | yes | yes | n/a | yes | yes | yes | yes | yes | yes | None. | Meets current |
| `tool.openapi` | yes | yes | yes | yes | n/a | yes | yes | yes | yes | yes | yes | None. | Meets current |
| `tool.export` | yes | yes | yes | yes | n/a | yes | yes | yes | yes | yes | yes | Full report designer and big-data async export remain explicit admission. | Meets current |
| `tool.openforge-admin` | yes | yes | yes | yes | n/a | yes | yes | yes | yes | yes | yes | Direct schema/migration/business-code writes remain explicit admission. | Meets current |
| `collaboration.message` | yes | yes | yes | yes | yes | yes | yes | yes | yes | yes | yes | None. | Meets current |
| `collaboration.notice` | yes | yes | yes | yes | yes | yes | yes | yes | yes | yes | yes | None. | Meets current |
| `collaboration.todo` | yes | yes | yes | yes | yes | yes | yes | yes | yes | yes | yes | None. | Meets current |
| `collaboration.approval-lite` | yes | yes | yes | yes | yes | yes | yes | yes | yes | yes | yes | Full BPMN/workflow remains explicit admission. | Meets current |
