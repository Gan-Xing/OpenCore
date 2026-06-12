# Cycle-021 Round 15 Completion Report: core.file Content Loop

Date: 2026-06-12  
Feature commit:
`0923009 feat(core-file): add authenticated file content loop / 新增认证文件内容闭环`

## Capability

`core.file` now has a real authenticated content loop. Operators can upload a
browser-selected file, inspect the generated metadata, download the stored
object and delete both metadata and stored bytes.

## Reference Comparison

Yudao's file center and RuoYi-style common upload flows both treat file
metadata as a pointer to stored content. OpenCore now admits that product
effect through its existing `@opencore/file` storage abstraction rather than
adding presigned URL or object-browser scope in this round.

## Implemented

- Added authenticated upload and download routes under `Core Files`.
- Wrote upload bytes through `FileStorageService` and generated matching
  metadata.
- Returned stored bytes with MIME and attachment headers.
- Deleted stored objects with metadata deletion.
- Preserved `storageKey` on metadata edits.
- Added binary response pass-through in the core response interceptor.
- Added SDK upload contract and download path helper.
- Updated Admin File Center for real upload and download actions.
- Updated smoke to assert downloaded content equals uploaded content.

## Verification

- `pnpm format:check`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm prisma:validate`
- `pnpm openapi:export`
- `pnpm openapi:check`
- `pnpm openapi:registry-tags:check`
- `pnpm registry:admin-routes:check`
- `pnpm sdk:check`
- `pnpm smoke:api:local`
- `pnpm deploy:opencore`
- Public verification against `http://144.217.243.161:39172` and
  `http://144.217.243.161:39174`.

## Public Result

The public API accepted login, uploaded a text file, returned matching
metadata, downloaded bytes matching the uploaded content exactly and deleted
the verification file. The public Admin file page returned 200 and its
deployed chunk contains the upload/download markers.

## Scope Held

This round did not add presigned URLs, public copy links, storage-provider
configuration UI, batch delete, object browser expansion or rich media preview
tooling.
