# cycle-021 Ledger

Date: 2026-06-13

This ledger records state transitions only. Git log keeps commit hashes.

| Round | Capability   | State Change                                                                  | Guard                                                          |
| ----- | ------------ | ----------------------------------------------------------------------------- | -------------------------------------------------------------- |
| 74    | Monitor Jobs | Admin moved from fixtures to live API operations and report seed drift fixed. | Monitor jobs smoke and Admin bundle markers.                   |
| 75    | Monitor Jobs | Registered handler execution, registry visibility and failed run diagnostics. | Monitor jobs smoke covers registry, handler and failed retry.  |
| 76    | Notice Mail  | Mail outbox subject became first-class persisted delivery state.              | Notice smoke covers outbox subject and SMTP subject.           |
| 77    | Integrations | Provider diagnostics expose readiness, backlog and last failure.              | Notice smoke and Admin bundle markers cover diagnostics.       |
| 78    | Notice SMS   | SMS HTTP providers inject config-vault secrets into request auth surfaces.    | Adapter tests and notice smoke cover header/query/body inject. |
