# cycle-003 Audit

London time: 2026-06-11 02:11 Europe/London

## Findings

OpenCore now has summary endpoints and list/action APIs for collaboration, operations, and integrations. The list APIs still accept only pagination. The reference systems expose practical filters on every operational table, especially status, type, enabled/disabled, assignee, recipient, provider, and prefix filters.

## Stage 1 Platform Core

The API foundation has a consistent page envelope, but list filtering is inconsistent and under-specified for newly admitted modules. Without bounded filters, Admin and SDK consumers must over-fetch and filter locally.

## Stage 2 Contract System

OpenAPI and SDK clients currently expose `PageRequest` only for new module list calls. Query contracts need typed filters so generated docs and SDK path behavior remain stable.

## Stage 3 OpenForge

OpenForge validates OpenAPI path/tag drift, but the docs/generator examples do not yet call out that generated list APIs should declare bounded filters rather than leaving tables with page-only query objects.

## Stage 4 Collaboration

Messages need status/recipient filters; notices need status filters; todos need status/assignee/source filters; approval-lite needs status/requester/approver filters. This mirrors NestWeb and Antdpro6 center tables without adding BPMN.

## Stage 5 Workflow / Reports / Jobs

Jobs need enabled and queue filters; run logs need status filters; cache needs prefix filtering; online users need active/revoked filtering; report definitions need enabled/owner filters. This mirrors RuoYi/Yudao monitor/report table behavior without implementing report designer/export execution.

## Stage 6 Integration Capability

Providers need type/enabled/health filters; mail/SMS templates need enabled filters; outbox lists need status/provider filters. This mirrors Yudao mail/SMS/OAuth organization while preserving design-only payment, WeChat, and WebSocket boundaries.
