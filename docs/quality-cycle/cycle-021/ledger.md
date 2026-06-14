# cycle-021 Ledger

Date: 2026-06-14

This ledger records state transitions only. Git log keeps commit hashes.

| Round | Capability       | State Change                                                                  | Guard                                                            |
| ----- | ---------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| 74    | Monitor Jobs     | Admin moved from fixtures to live API operations and report seed drift fixed. | Monitor jobs smoke and Admin bundle markers.                     |
| 75    | Monitor Jobs     | Registered handler execution, registry visibility and failed run diagnostics. | Monitor jobs smoke covers registry, handler and failed retry.    |
| 76    | Notice Mail      | Mail outbox subject became first-class persisted delivery state.              | Notice smoke covers outbox subject and SMTP subject.             |
| 77    | Integrations     | Provider diagnostics expose readiness, backlog and last failure.              | Notice smoke and Admin bundle markers cover diagnostics.         |
| 78    | Notice SMS       | SMS HTTP providers inject config-vault secrets into request auth surfaces.    | Adapter tests and notice smoke cover header/query/body inject.   |
| 79    | Notice Mail      | Mail outbox attachments became bounded persisted SMTP delivery state.         | Adapter tests and notice smoke cover SMTP MIME attachments.      |
| 80    | Notice Mail      | SMTP TLS behavior became explicit `tlsMode` policy.                           | Adapter tests and notice smoke cover STARTTLS-required policy.   |
| 81    | Notice Inbox     | Notice inbox realtime became authenticated SSE snapshot/read events.          | Notice smoke covers auth, snapshot and read-event streaming.     |
| 82    | Config           | Public config values gained environment-specific runtime overrides.           | Config smoke covers guards, runtime and feature rollout.         |
| 83    | Config           | Secret config values gained version history and explicit rotation.            | Config smoke covers seed versions, guards and plaintext leaks.   |
| 84    | Config           | Secret vault gained env keyring status and vault key rotation.                | Config smoke covers legacy/v2 envelopes, rewrap and leaks.       |
| 85    | Audit Logs       | Operation logs gained duration/location fields and retention scheduling.      | Audit smoke covers filters, retention cleanup and job registry.  |
| 86    | OpenForge        | Admin gained a live safe generator workbench backed by API/SDK.               | OpenForge smoke and Admin bundle markers cover dry-run flows.    |
| 87    | Integration      | Providers gained a global health/config audit across diagnostics and outbox.  | Integration health smoke and Admin bundle markers cover audit.   |
| 88    | Monitor Jobs     | Scheduler gained cron dispatch, worker claim execution and queue metrics.     | Monitor jobs smoke and Admin bundle markers cover worker flow.   |
| 89    | OpenForge        | Dry-run operations gained confirmation plus manifest preview/detail.          | OpenForge smoke and Admin bundle markers cover dry-run guards.   |
| 90    | IP Location      | Login logs gained structured offline provider status and lookup.              | Login-log smoke and Admin bundle markers cover GeoIP lookup.     |
| 91    | Online Users     | Token sessions gained allowlist enforcement and expired cleanup.              | Online-user smoke and Admin bundle markers cover maintenance.    |
| 92    | OAuth Tokens     | Integration OAuth tokens gained inventory, detail and revoke lifecycle.       | OAuth token smoke and Admin bundle markers cover token revoke.   |
| 93    | IP Location      | GeoIP gained a guarded external HTTP JSON adapter with offline fallback.      | Common tests, login-log smoke and Admin bundle markers.          |
| 94    | Config           | Secret vault gained managed HTTP JSON KMS v3 envelopes.                       | System tests, config smoke and Admin bundle markers.             |
| 95    | Monitor Cache    | Cache monitor moved from seed/Admin fixtures to real Redis operations.        | API tests, monitor smoke and Admin bundle markers.               |
| 96    | Monitor Version  | Version page moved from fixtures to live runtime/deployment metadata.         | API tests, monitor smoke and Admin bundle markers.               |
| 97    | Tool OpenAPI     | OpenAPI page moved from fixtures to live drift snapshot metadata.             | API tests, tool smoke and Admin bundle markers.                  |
| 98    | Tool Export      | Export page moved from fixtures to live protocol and preview APIs.            | API tests, tool smoke and Admin bundle markers.                  |
| 99    | Tool Export      | Shared current-page export buttons moved from SDK fixtures to live protocol.  | Admin smoke and deploy bundle markers cover shared export.       |
| 100   | Integration Mail | Mail Admin moved from fixtures to live template/outbox operations.            | Admin smoke and deploy bundle markers cover live Mail page.      |
| 101   | Integration SMS  | SMS Admin moved from fixtures to live template/outbox operations.             | Admin smoke and deploy bundle markers cover live SMS page.       |
| 102   | Collaboration    | Messages Admin moved from fixtures to live lifecycle operations.              | Message smoke plus Admin/deploy guards cover live Messages page. |
| 103   | Collaboration    | Notices Admin moved from fixtures to live lifecycle operations.               | Notice smoke plus Admin/deploy guards cover live Notices page.   |
| 104   | Collaboration    | Todos Admin moved from fixtures to live lifecycle operations.                 | Todo smoke plus Admin/deploy guards cover live Todos page.       |
| 105   | Collaboration    | Approval Lite Admin moved from fixtures to live lifecycle operations.         | Approval smoke plus Admin/deploy guards cover live Approvals.    |
| 106   | Integration      | WeChat/WebSocket design Admin moved from fixtures to live design reads.       | Design smoke plus Admin/deploy guards cover live design pages.   |
| 107   | Monitor Status   | Status gained live CPU, memory, disk and process runtime resources.           | Status smoke plus Admin/deploy guards cover live runtime fields. |
| 108   | Monitor Queues   | Queues gained guarded BullMQ pause/resume and live-only Admin data.           | Monitor smoke plus Admin/deploy guards cover queue control.      |
| 109   | Security Logs    | Log Admin pages became live-only and operation logs gained server filters.    | Admin smoke plus deploy guards reject fixture-backed log pages.  |
| 110   | Monitor Jobs     | Jobs gained terminal run-log retention cleanup and live-only Admin guards.    | Scheduler tests, monitor smoke and deploy guards cover cleanup.  |
| 111   | OAuth Tokens     | OAuth Admin became live-only for token list/detail/revoke controls.           | Admin smoke and deploy guards reject OAuth fixture fallback.     |
| 112   | Online Users     | Online Users Admin became live-only for session operations.                   | Admin smoke and deploy guards reject online-user fixture fallback. |
| 113   | Integration      | Providers Admin became live-only for health audit and diagnostics.            | Admin smoke and deploy guards reject provider fixture fallback.  |
