# Cycle-021 Round 19 Completion Report: core.user Security Mutation

Date: 2026-06-12  
Feature commit:
`c4347b4 feat(core-user): add user security mutation loop / 新增用户安全变更闭环`  
Smoke hardening commit:
`04e446c fix(online-user): stabilize admin session smoke / 稳定在线用户管理员会话冒烟`

## Capability

`core.user` now has a direct security mutation loop. Operators can disable or
enable normal users, reset passwords, update users and delete users while
OpenCore invalidates affected active sessions and reports the revoked-session
count back to the Admin UI.

## Reference Comparison

RuoYi and Yudao both treat user status changes and password reset as basic user
management security actions. OpenCore now admits the same product shape within
its existing user and online-session boundaries, while leaving broader
department side-tree, post binding, profile/avatar and import/export workflows
for later user-product stages.

## Implemented

- Added dedicated status and password-reset DTOs plus mutation result metadata.
- Hardened runtime validation so `enabled` must be a boolean and malformed
  status/reset bodies fail before mutation.
- Added `PATCH /api/core/users/:id/status` and
  `POST /api/core/users/:id/reset-password`.
- Revoked active sessions after status change, password reset, direct update
  and delete.
- Returned `revokedSessionCount` from user mutation responses.
- Extended OpenAPI, SDK contracts/client methods and SDK tests.
- Added Admin Users status toggle, reset-password dialog and revoked-session
  feedback.
- Added fixed-port/deploy/public `core.user` smoke covering disabled-login
  blocking, old-token 401, old-password rejection and mutation cleanup.
- Stabilized online-user deploy smoke so it validates the current admin token
  session instead of depending on seeded admin pagination.

## Verification

- Standard round gates passed; repeated command transcripts were removed during docs compaction.

- Focused system, SDK and API permission-matrix tests.
- Focused typecheck for system, API and Admin.
- Admin tests, OpenAPI export/check, SDK check and registry checks.
- Public verification against `http://144.217.243.161:39172` and
  `http://144.217.243.161:39174`.

## Public Result

The public `core.user` smoke created a temporary user, disabled that user,
proved the old token returned 401 and login was blocked, re-enabled the user,
reset the password, proved the old password was rejected, updated the user and
deleted the user while each security mutation revoked the active session. The
public Admin Users page returned 200 and the deployed Users chunk contains the
reset-password and revoked-session UI markers.

## Scope Held

This round did not add department side-tree filtering, post binding,
profile/avatar/social endpoints, Excel import/export workflows, batch user
delete, separate User-page role assignment or broader option endpoints. Those
remain in the `core.user` enhancement queue.
