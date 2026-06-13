# Round 48 Completion Report: core.login-log Cleanup Maintenance Actions

## Scope

Round 48 closed the login-log cleanup maintenance stage for `core.login-log`.

This round delivered:

- permissioned selected-row login-log deletion;
- permissioned clean-all login-log maintenance;
- strict empty, duplicate and missing-ID batch guards;
- no-partial-delete behavior for mixed existing/missing IDs;
- SDK/OpenAPI/Admin cleanup actions;
- Admin `core:login-log:delete` access wiring;
- fixed-port, deploy and public smoke coverage for delete, clean-all and
  post-clean logging.

Out of scope: IP location enrichment, configurable failed-attempt threshold,
logout/mobile/SMS/social login recording and session termination from the
login-log page.

## Commits

- Feature commit:
  `052d9be feat(login-log): add cleanup maintenance actions / 新增登录日志清理维护动作`
- Docs commit: this documentation commit

## Deployment

- API: `http://144.217.243.161:39172`
- Admin: `http://144.217.243.161:39174`
- Admin main bundle: `umi.5e1fae41.js`
- Login Logs chunk: `p__Security__LoginLogs.1647b5aa.async.js`

## Verification

- Standard round gates passed; repeated command transcripts were removed during docs compaction.

Public API smoke passed with:

- `core.login-log.batch-delete-empty-guard`
- `core.login-log.batch-delete-duplicate-guard`
- `core.login-log.batch-delete-missing-no-partial`
- `core.login-log.batch-delete`
- `core.login-log.batch-delete-detail-404`
- `core.login-log.clean-all`
- `core.login-log.clean-all-list-empty`
- `auth.post-clean-failed-login-recorded`

Public Admin verification passed with:

- no stale HTML cache on `/user/login`;
- main bundle using `http://144.217.243.161:39172`;
- no bundle-generated duplicate `/api/api/auth/login`;
- Login Logs chunk containing cleanup UI and `core:login-log:delete` markers;
- same-origin `/api/core/login-logs/batch` reaching the empty payload guard.

## Remaining Debt

- IP/location enrichment where feasible.
- Configurable failed-attempt threshold beyond the current fixed five-attempt
  baseline.
- Logout/mobile/SMS/social login logging.
- Session termination from the login-log page, if accepted as a future product
  stage.
