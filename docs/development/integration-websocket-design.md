# WebSocket Integration Design

OpenCore keeps WebSocket support as an authenticated runtime diagnostics
surface until a product workflow needs a full socket gateway. The current
runtime uses an authenticated SSE stream to prove connection status,
subscription routing and diagnostic event delivery without introducing IM chat.

## Contract

- Authenticate during connection upgrade with the same bearer-token model as HTTP.
- Bind rooms to permission-scoped resources.
- Declare event names, payload schemas, retention policy, and audit category before enabling a room.
- Reject unauthenticated connections and room joins without the matching permission.
- Include request id or trace id when events are emitted from HTTP workflows.
- Runtime diagnostic rooms are limited to `integration.*` identifiers.
- Runtime diagnostic event publish is limited to `diagnostic.*` event names.
- Runtime payloads are retained only as redacted bounded previews.
- OpenForge schemas for WebSocket Admin/provider pages must mark connection
  tokens, authorization values, event payloads and room policy config as
  `sensitive` or `detailOnly` so generated current-page search, detail and CSV
  export do not expose credentials or raw payloads.

## Security Boundary

- No anonymous rooms.
- No direct broadcast from untrusted request bodies.
- No durable event storage without an explicit retention policy.
- No industry module events before the owning module is admitted.
- No IM/chat semantics in the integration runtime surface.

## Verification

Implementation must include connection-auth tests, permission tests for room
joins, payload schema tests, runtime diagnostics smoke, stream delivery checks
and secret-redaction checks for privileged diagnostic emissions.
