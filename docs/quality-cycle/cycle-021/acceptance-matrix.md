# cycle-021 Admin Fallback Closure Acceptance Matrix

Date: 2026-06-14

This matrix is limited to the seven fixed System Admin fallback closure items.
It must not be expanded into general capability-map productization work.

Legend:

- `yes`: accepted for this column.
- `no`: not accepted.
- `partial`: some guard or smoke exists, but the column is not fully accepted.
- `pending`: not verified in the Capstone Acceptance flow yet.
- `n/a`: not required for this item.

Public smoke rule:

- `Public smoke` is accepted only when both public API smoke and public Admin
  smoke are accepted.
- `Public API smoke` means a real request to the public API URL succeeds.
- `Public Admin smoke` means a real request to the public Admin URL or relevant
  public Admin page/runtime surface succeeds.
- `Bundle marker smoke` checks built Admin chunks for required/forbidden
  markers; it is not a substitute for public API/Admin smoke.
- Printing or documenting a public URL is not public verification.

| Capability                         | API live | SDK live | Admin live-only | Permission/Menu | Seed/Migration | OpenAPI | Local smoke | Public smoke | Public API smoke | Public Admin smoke | Bundle marker smoke | Deploy guard | Remaining debt                                                                                        | Status           |
| ---------------------------------- | -------- | -------- | --------------- | --------------- | -------------- | ------- | ----------- | ------------ | ---------------- | ------------------ | ------------------- | ------------ | ----------------------------------------------------------------------------------------------------- | ---------------- |
| System Roles Admin live-only       | yes      | yes      | yes             | yes             | yes            | yes     | yes         | yes          | yes              | yes                | yes                 | yes          | None for this row; unified seven-page guard remains a separate queue item.                            | Meets            |
| System Users Admin live-only       | yes      | yes      | yes             | yes             | yes            | yes     | yes         | yes          | yes              | yes                | yes                 | yes          | None for this row; unified seven-page guard remains a separate queue item.                            | Meets            |
| System Config Admin live-only      | yes      | yes      | yes             | yes             | yes            | yes     | yes         | yes          | yes              | yes                | yes                 | yes          | None for this row; unified seven-page guard remains a separate queue item.                            | Meets            |
| System Notices Admin live-only     | yes      | yes      | yes             | yes             | yes            | yes     | yes         | yes          | yes              | yes                | yes                 | yes          | None for this row; unified seven-page guard remains a separate queue item.                            | Meets            |
| System Files Admin live-only       | yes      | yes      | no              | yes             | yes            | yes     | yes         | no           | pending          | no                 | partial             | partial      | Remove file fixture fallback and fallback UI; add Admin/deploy guards and public Admin smoke.         | Open             |
| System Permissions Admin live-only | yes      | yes      | yes             | yes             | yes            | yes     | yes         | partial      | pending          | pending            | yes                 | yes          | Confirm public API/Admin smoke in the closure flow and keep global no-fixture-fallback guard current. | Meets local only |
| System Posts Admin live-only       | yes      | yes      | yes             | yes             | yes            | yes     | yes         | partial      | pending          | pending            | yes                 | yes          | Confirm public API/Admin smoke in the closure flow and keep global no-fixture-fallback guard current. | Meets local only |
