# cycle-021 Ledger

Date: 2026-06-14

This ledger records state transitions only. Git log keeps commit hashes.

| Round | Capability   | State Change                                                                  | Guard                                                          |
| ----- | ------------ | ----------------------------------------------------------------------------- | -------------------------------------------------------------- |
| 74    | Monitor Jobs | Admin moved from fixtures to live API operations and report seed drift fixed. | Monitor jobs smoke and Admin bundle markers.                   |
| 75    | Monitor Jobs | Registered handler execution, registry visibility and failed run diagnostics. | Monitor jobs smoke covers registry, handler and failed retry.  |
| 76    | Notice Mail  | Mail outbox subject became first-class persisted delivery state.              | Notice smoke covers outbox subject and SMTP subject.           |
| 77    | Integrations | Provider diagnostics expose readiness, backlog and last failure.              | Notice smoke and Admin bundle markers cover diagnostics.       |
| 78    | Notice SMS   | SMS HTTP providers inject config-vault secrets into request auth surfaces.    | Adapter tests and notice smoke cover header/query/body inject. |
| 79    | Notice Mail  | Mail outbox attachments became bounded persisted SMTP delivery state.         | Adapter tests and notice smoke cover SMTP MIME attachments.    |
| 80    | Notice Mail  | SMTP TLS behavior became explicit `tlsMode` policy.                           | Adapter tests and notice smoke cover STARTTLS-required policy. |
| 81    | Notice Inbox | Notice inbox realtime became authenticated SSE snapshot/read events.          | Notice smoke covers auth, snapshot and read-event streaming.   |
| 82    | Config       | Public config values gained environment-specific runtime overrides.           | Config smoke covers guards, runtime and feature rollout.       |
| 83    | Config       | Secret config values gained version history and explicit rotation.            | Config smoke covers seed versions, guards and plaintext leaks. |
| 84    | Config       | Secret vault gained env keyring status and vault key rotation.                | Config smoke covers legacy/v2 envelopes, rewrap and leaks.     |
