# cycle-007 Audit

London time: 2026-06-11 03:18:41 Europe/London

## Findings

OpenCore already has a current-page export protocol, tooling API preview, SDK fixture, and an Export Tools page. The Admin table pages added in S10/S11/S12 do not consistently expose a reusable current-page export action. RBAC pages show a placeholder Export button, but admitted collaboration, operations, and integration pages have no bounded CSV export path and no sensitive-field exclusion policy at the UI level.

## Stage 1 Platform Core

Admin needs a reusable current-page export button/helper that converts the visible fixture rows to CSV, caps rows by the shared S8 protocol, and excludes sensitive columns before serialization.

## Stage 2 Contract System

The SDK tooling client and contract fixture already model `current-page` export preview. The missing contract surface is a typed Admin column definition that carries `sensitive` exclusion metadata and can be reused by fixture-backed pages.

## Stage 3 OpenForge

OpenForge generated Admin docs mention export buttons, but they do not yet specify that generated exports must be current-page, bounded, and sensitive-column aware. This needs to match the S8 protocol and avoid async export job behavior.

## Stage 4 Collaboration

Messages, notices, todos, and Approval Lite pages lack current-page export actions. Exports should use summary columns and avoid expanding full detail bodies or hidden/deleted records.

## Stage 5 Workflow / Reports / Jobs

Jobs, online users, reports, and export-job design pages lack current-page export actions. Online-user export must not include token identifiers or revocation secrets; reports must not execute query schemas.

## Stage 6 Integration Capability

Providers, mail/SMS templates, OAuth, and design-boundary pages lack current-page export actions. Provider exports must exclude config and secret refs; outbox payloads and template bodies should stay out of CSV summaries unless explicitly admitted later.
