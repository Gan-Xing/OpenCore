# cycle-012 Audit

London time: 2026-06-11 04:22 Europe/London

## Theme

Shared Admin detail JSON redaction safety net.

## Scope

- `apps/admin/src/pages/shared/ReadOnlyDetailDrawer.tsx`
- Admin pages that render `jsonSections` through the shared drawer: collaboration, operations, optional, integration and core system/security pages
- Admin smoke test enforcement
- OpenForge V1 template/architecture guidance for generated Admin detail drawers

## Findings

- F1: `ReadOnlyDetailDrawer` rendered `jsonSections` with `JSON.stringify(section.value, null, 2)`. Existing fixtures are mostly redacted at source, but the shared renderer had no generic sensitive-key fallback for nested JSON.
- F2: Integration providers, mail/SMS/OAuth/WeChat/WebSocket, collaboration records, export jobs, operation logs and system management detail drawers all share this JSON rendering path. A shared helper gives broad coverage without page-level duplication.
- F3: OpenForge authoring docs required source-level redaction for config values and export columns, but did not state that generated Admin JSON detail sections need a recursive pre-serialization redaction guard.

## Decision

Implement a small recursive redaction helper in the shared read-only drawer. The helper redacts values whose object keys match password, secret, token, credential, authorization, API key or client secret terminology, including nested arrays and plain objects. It intentionally avoids a generic `key` match because Admin data has safe identifiers such as `requestId`, `storageKey` and config `key`.

Keep source-level redaction rules intact. The shared drawer guard is a final rendering safety net, not permission to put secrets into API/SDK fixtures.
