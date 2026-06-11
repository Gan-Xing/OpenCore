# Admin Ant Design Pro V6 Migration Notes

Date: 2026-06-11
Branch: `fix/admin-ant-design-pro-v6`

## Baseline Commits

- Current branch commit: `f6ce56d5f9656dc390d295a9eaa62f744172ad71`
- `origin/main` commit: `69223d6d37e1ed6ef67bcdfcf3e6375ab706e60c`

## Reusable Pro V6 Architecture Assets

- `apps/admin/config/config.ts`
- `apps/admin/config/defaultSettings.ts`
- `apps/admin/config/proxy.ts`
- `apps/admin/config/routes.ts`
- `apps/admin/src/app.tsx`
- `apps/admin/src/requestErrorConfig.ts`
- `apps/admin/src/components/Footer`
- `apps/admin/src/components/HeaderDropdown`
- `apps/admin/src/components/RightContent`
- `apps/admin/src/components/ErrorBoundary`
- `apps/admin/src/components/OfflineBanner`
- `apps/admin/src/locales/**`
- Pro V6 package/tooling baseline: `@umijs/max`, `@umijs/max-plugin-openapi`, `@umijs/request-record`, React Query, Vitest, Biome, and `max openapi`.

## Main Business Pages To Migrate

- `Dashboard`
- `System/Users`
- `System/Roles`
- `System/Permissions`
- `System/Menus`
- `System/Dicts`
- `System/Config`
- `System/Files`
- `Security/LoginLogs`
- `Security/OperationLogs`
- `Monitor/Status`
- `Monitor/Version`
- `Monitor/Queues`
- `Monitor/Jobs`
- `Monitor/Cache`
- `Monitor/OnlineUsers`
- `Tools/OpenApi`
- `Tools/Export`
- `Tools/OpenForge`
- `Collaboration/Messages`
- `Collaboration/Notices`
- `Collaboration/Todos`
- `Collaboration/Approvals`
- `Optional/Reports`
- `Optional/ExportJobs`
- `Integrations/Providers`
- `Integrations/Mail`
- `Integrations/Sms`
- `Integrations/OAuth`
- `Integrations/WeChat`
- `Integrations/WebSocket`
- `Integrations/BillingDesign`
- `Exception/403`
- `Exception/404`
- `Exception/500`
- Shared helpers: `pages/shared/**`, `core/shellRegistry.ts`, `utils/request.ts`, `components/EmptyState`.

## Demo Content To Remove Or Isolate

- Demo routes: `/welcome`, `/admin`, `/admin/sub-page`, `/form/*`, `/list/*`, `/profile/*`, `/result/*`, `/account/*`, `/chatbot`, `/user/register`, `/user/register-result`.
- Demo pages/services: `Welcome`, `Admin`, lowercase `dashboard`, `form`, `list`, `profile`, `result`, `account`, `chatbot`, `table-list`, demo register pages, and `src/services/ant-design-pro/**`.
- Demo API/config: `config/oneapi.json`, `pro-api.ant-design-demo.workers.dev`, `preview.pro.ant.design`, `/api/currentUser`, `/api/login/account`, `/api/login/captcha`, and demo mocks under `apps/admin/mock`.
- Demo tests/snapshots tied to the removed routes and services.

## Backend Integration API List

- `POST /api/auth/login`
- `GET /api/auth/me`
- `Authorization: Bearer <token>`
- `x-request-id`
- `x-trace-id`
- `401 -> /user/login?redirect=...`
- `403 -> /403`

## Initial Risks And Outcomes

- Resolved: `registry:admin-routes:check` now parses `apps/admin/config/routes.ts`.
- Resolved: OpenForge Admin route patch output and authoring docs now target `apps/admin/config/routes.ts`.
- Resolved: Pro V6 login, app runtime, avatar logout, tests, and generated typings are wired to OpenCore auth/current-user paths instead of Ant Design demo APIs.
- Resolved after re-audit: `System/Users` and `Monitor/Status` now invoke live OpenCore SDK clients through `src/services/opencore/platform.ts`; fixtures remain only as fallback snapshots.
- Verified: local API/Admin HTTP smoke passed with `.env.opencore.local`, Prisma migrate/seed, `POST /api/auth/login`, `GET /api/auth/me`, one System API, one Monitor API, 401, 403, and request/trace response headers.
- Remaining caveat: interactive browser automation was not run because `gstack browse` is not built in this checkout and Playwright/Puppeteer are not installed; Admin SPA route serving was verified over HTTP and browser-side request/error behavior is covered by Admin smoke/Vitest.
- Remaining boundary: the rest of the migrated formal pages keep the `origin/main` fixture-backed/read-only baseline unless their modules already had a live page admission path.
