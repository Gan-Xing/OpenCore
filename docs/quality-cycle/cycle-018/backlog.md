# cycle-018 Backlog

## Stage 1 - Filename Sanitizer

- [x] P1 Add a shared current-page CSV filename sanitizer.

## Stage 2 - Filename Policy

- [x] P2 Strip path separators/control characters, remove edge dots, provide a safe fallback and enforce `.csv`.

## Stage 3 - Export Integration

- [x] P3 Apply the sanitizer before invoking browser download.

## Stage 4 - Smoke Enforcement

- [x] P4 Extend Admin smoke checks so CSV export keeps filename sanitization alongside formula and redaction guards.

## Stage 5 - Documentation

- [x] P5 Document CSV filename sanitization in export/upload and OpenForge generated Admin export guidance.

## Stage 6 - Verification

- [x] P6 Run focused formatting, Admin typecheck/test/lint, SDK tests, route drift and OpenForge checks.

## Closeout

- [x] close1 Update cycle implementation notes with the exact code/docs changes.
- [x] close2 Run the quality-cycle gate for cycle 018.
- [x] close3 Write the completion report.
- [x] close4 Complete cycle 018 with `--run-gate`.
