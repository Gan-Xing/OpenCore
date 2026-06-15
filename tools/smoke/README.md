# Typed Smoke Scripts

This directory is the TypeScript smoke entrypoint for new or migrated smoke
coverage.

Rules:

- Use `createTypedSmokeRuntime()` for base URL, auth, request timeouts and SDK
  client wiring.
- Legacy `.mjs` smoke scripts are not allowed; shared runtime behavior belongs
  in `runtime.ts`.
- Prefer SDK clients for accepted 2xx API paths so request and response DTOs
  stay type-checked against `@opencore/sdk`.
- Keep `smoke.apiRequest()` for negative-path guards, malformed payloads,
  binary downloads, SSE streams, callback signatures and provider mocks where
  SDK clients intentionally do not model the invalid request.
- Add each typed smoke to `package.json` through
  `tools/scripts/run-typed-smoke.mjs`.
- `pnpm smoke:typed:check` must pass before a typed smoke script is committed.

Do not add `.mjs` smoke scripts. New smoke coverage should be a typed entry in
this directory and should reuse `runtime.ts`.
