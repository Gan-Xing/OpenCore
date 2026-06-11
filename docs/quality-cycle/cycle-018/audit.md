# cycle-018 Audit

London time: 2026-06-11 05:16 Europe/London

## Theme

Current-page CSV download filename sanitization.

## Scope

- `apps/admin/src/pages/shared/CurrentPageExportButton.tsx`
- Admin smoke test enforcement
- Export/upload contract and OpenForge V1 Admin export guidance

## Findings

- F1: Current-page CSV export already bounds row count, excludes sensitive columns, redacts object cells and neutralizes spreadsheet formula prefixes.
- F2: The browser download filename still used `filename ?? opencore-${resource}.csv` directly, so generated or future callers could pass path separators, control characters or non-CSV extensions.
- F3: Current callers use safe literal resource names, but the shared export boundary should enforce a local `.csv` basename.

## Decision

Add a shared CSV filename sanitizer that strips path/control characters, removes leading/trailing dots, falls back to `opencore-export`, and forces a `.csv` extension before invoking the browser download.
