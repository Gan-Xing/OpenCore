# cycle-018 Completion Report

London time: 2026-06-11 05:21 Europe/London

## Summary

Cycle 018 hardened Admin current-page CSV downloads by sanitizing the browser download filename at the shared export boundary. Filenames now resolve to a local `.csv` basename before `downloadCsv` runs.

## Changes

- Added `sanitizeCsvFilename` in `apps/admin/src/pages/shared/CurrentPageExportButton.tsx`.
- Stripped path separators/control characters, removed leading/trailing dots, used `opencore-export` as the fallback basename and enforced `.csv`.
- Applied filename sanitization before browser download.
- Extended Admin smoke checks to require filename sanitization alongside formula-prefix neutralization and object-cell redaction.
- Updated export/upload and OpenForge V1 Admin export guidance.

## Follow-Up

- Generated Admin exports should continue using stable resource names, but the shared helper now protects future custom filenames.
