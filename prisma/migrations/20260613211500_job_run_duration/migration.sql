ALTER TABLE "JobRunLog"
  ADD COLUMN "durationMs" INTEGER;

UPDATE "JobRunLog"
SET "durationMs" = GREATEST(
  0,
  FLOOR(EXTRACT(EPOCH FROM ("finishedAt" - "startedAt")) * 1000)::INTEGER
)
WHERE "finishedAt" IS NOT NULL;
