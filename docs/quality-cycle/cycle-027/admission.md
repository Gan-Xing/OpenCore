# Cycle-027 CRM Admission

Date: 2026-06-30

## Goal

Admit `business.core` as OpenCore's first commercial tenant-owned business
foundation. C027 delivers the sales-front-office loop: lead capture, customer
accounting, contacts, opportunities, follow-ups, task reminders, tags, owner
transfer, attachments, audit, and basic statistics.

## Reference Translation

- Yudao CRM validates the object map: customers, contacts, clues, business
  opportunities, follow-up records, ownership/transfer, and statistics.
- JeecgBoot validates the enterprise platform shape: module metadata,
  permission/menu discipline, reportable lists, and consistent generated-like
  CRUD behavior.
- OpenCore implements the domain in its own NestJS, Prisma, Umi, SDK,
  module-registry, tenant guard, smoke, and release-gate path. No Java/Vue code
  or low-code runtime is copied.

## In Scope

- `CrmLead`: lead pool with status, source, owner, next-contact reminder, and
  conversion target.
- `CrmCustomer`: account master with owner, level, source, industry, region,
  status, tags, next-contact reminder, and last-follow-up timestamp.
- `CrmContact`: customer contacts with primary flag and owner.
- `CrmOpportunity`: sales opportunity with stage, amount, probability,
  expected close date, owner, and close state.
- `CrmFollowUp`: notes and activities attached to lead, customer, contact, or
  opportunity.
- `CrmTask`: CRM reminders for customer/lead/opportunity follow-up work.
- `CrmTag`: tenant-owned CRM classification.
- `CrmAttachment`: metadata records linked to CRM entities and existing file
  storage keys.
- `CrmOwnerTransfer`: ownership transfer ledger.
- `CrmAuditEvent`: domain audit event ledger for commercial traceability.
- Summary and current-page export APIs for operational reporting.

## Explicit Non-Goals

- Contracts, receivables, products, quotes, invoices, payment, and accounting.
- Full workflow/BPMN, report designer, import wizard, public customer portal,
  mobile app, AI assistant, or OpenForge/low-code expansion.
- CRM row-level sharing teams beyond a single owner plus admin RBAC. Add a
  dedicated CRM sharing model only when users request multi-owner collaboration.

## Admission Requirements

- Every persisted business row is tenant-owned and has tenant-scoped indexes or
  unique constraints.
- API, OpenAPI, SDK, Admin, permissions, menus, smoke, guard, seed, and docs
  use the same `business.core` vocabulary.
- Admin pages are live-only and include loading, empty, failure, create, update,
  transfer, detail, follow-up, attachment, task, summary, and safe current-page
  export states.
- Cross-tenant read/write/update/delete attempts are hidden or rejected and the
  foreign rows are preserved.
- `pnpm release:gate` must pass after implementation, deployment, and public
  smoke. C027 lands as an independent commit.
