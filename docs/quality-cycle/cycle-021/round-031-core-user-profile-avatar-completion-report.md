# Round 31 Completion Report: core.user Profile Avatar

Date: 2026-06-13
Feature commit:
`09cb9b0 feat(core-user): add profile avatar loop / 新增用户头像闭环`
Public API: `http://144.217.243.161:39172`
Public Admin: `http://144.217.243.161:39174`

## Scope

Round 31 closed the next `core.user` P1 productization gap: authenticated
current-user avatar upload/removal plus public preview backed by OpenCore file
storage.

This round remains one deployable, verifiable and reversible stage. It does
not mark the entire user product as complete.

## Delivered

- Prisma user avatar metadata:
  `avatarUrl/avatarStorageKey/avatarMimeType/avatarSizeBytes/avatarUpdatedAt`.
- System user repository/service avatar read/set/clear contracts for seed and
  Prisma implementations.
- Public user summary/profile/auth payloads with `avatarUrl` and public avatar
  metadata, without exposing storage keys.
- Auth-only `POST /api/core/users/profile/avatar` with file-name, base64,
  max-size, MIME and magic-byte validation.
- Auth-only `DELETE /api/core/users/profile/avatar` for cleanup and idempotent
  remove.
- Public read-only `GET /api/core/users/:id/avatar` for browser image preview.
- SDK/OpenAPI/Admin updates for avatar upload and delete.
- Admin Profile upload/remove avatar controls and top-bar avatar state sync.
- Fixed-port/deploy/public user smoke for auth guard, invalid MIME/base64,
  upload, public byte download, `/auth/me` avatar refresh, delete and
  post-delete 404.
- Public Admin same-origin preview verification through `/api`.

## Verification

- Standard round gates passed; repeated command transcripts were removed during docs compaction.

- `node scripts/smoke-test.mjs` from `apps/admin`

## Public Verification

- Public `pnpm smoke:core-user` passed against
  `http://144.217.243.161:39172`.
- Public smoke verified avatar auth guard, invalid MIME/base64 guards,
  byte-for-byte public download, `/auth/me` avatar URL refresh, delete and
  post-delete 404.
- `GET http://144.217.243.161:39172/health/ready` returned 200.
- `GET http://144.217.243.161:39174/` returned 200.
- `GET http://144.217.243.161:39174/personal/profile` returned 200.
- Public Profile chunk `p__Personal__Profile.e34daa22.async.js` contains
  `Upload avatar`, `Remove avatar`, `Avatar updated.`, `Avatar removed.` and
  `avatarUrl`.
- Public Admin same-origin proxy login returned 201 for both `/api/auth/login`
  and stale-compatible `/api/api/auth/login`; public API origin
  `/api/api/auth/login` also returned 201.
- Public Admin same-origin avatar verification uploaded a PNG through
  `http://144.217.243.161:39174/api/core/users/profile/avatar` and fetched the
  returned `avatarUrl` through the Admin origin with matching bytes.

## Remaining User Product Debt

- User import/export file workflows.
- Batch user deletion and batch enable/disable with session revocation.
- Email/phone profile fields if admitted into the OpenCore user schema.
- Social account binding.
- Dedicated user-page role assignment dialog if admitted separately from the
  role-user assignment flow.
