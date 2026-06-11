# cycle-004 Audit

London time: 2026-06-11 02:28:45 Europe/London

## Findings

OpenCore now has collaboration, operations, and integration list filters plus summary endpoints. The remaining risk is action safety: several action endpoints can currently mutate terminal or disabled records in the seed and Prisma repositories. This is a platform-quality issue because Admin, SDK, and OpenAPI expose these actions as stable contracts.

## Stage 1 Platform Core

Action endpoints need explicit state-transition guards. Current helpers cover pagination, required records, job numeric safety, cache clear confirmation, and approval pending checks, but not deleted message actions, terminal todo actions, disabled job trigger, repeated session kick-out, or disabled integration outbox enqueue.

## Stage 2 Contract System

SDK path specs verify representative actions, but not the full action matrix for archive/delete, notice lifecycle, todo terminal transitions, operations enable/disable/run/session actions, and integration enable/disable/outbox/design paths. Without these tests, future route changes can drift silently.

## Stage 3 OpenForge

OpenForge docs describe bounded filters and protected writes, but generated or hand-authored action endpoints also need state guard expectations: validate current state before mutating, reject disabled providers/jobs, and keep destructive operations confirmed or dry-run by default.

## Stage 4 Collaboration

Messages can be read/archived/deleted after deletion through direct action calls. Notices can be republished after archive. Todos can be reassigned, completed, or canceled after terminal states. Approval Lite already rejects non-pending decisions and should be the pattern for the rest of collaboration.

## Stage 5 Workflow / Reports / Jobs

Operations actions need parity with RuoYi/Yudao job and online-user behavior: disabled jobs should not be manually triggered, repeated session kick-out should be rejected or preserved, and Admin should show which actions are guarded. Cache clear already has a safe prefix and confirmation policy.

## Stage 6 Integration Capability

Integration outbox enqueue currently allows disabled providers and uses a plain `Error` for channel/provider mismatch. Mail/SMS enqueue should reject disabled or wrong-channel providers and disabled templates with Nest exceptions, preserving the design-only boundaries for pay, WeChat, and WebSocket.
