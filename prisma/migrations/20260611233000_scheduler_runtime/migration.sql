-- Create scheduler runtime tables when older local databases were created
-- before operations tables were tracked in migrations.
CREATE TABLE IF NOT EXISTS "JobDefinition" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "queueName" TEXT NOT NULL,
  "cron" TEXT,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "retryLimit" INTEGER NOT NULL DEFAULT 3,
  "timeoutSeconds" INTEGER NOT NULL DEFAULT 60,
  "payload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "JobDefinition_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "JobDefinition_code_key"
ON "JobDefinition"("code");

CREATE TABLE IF NOT EXISTS "JobRunLog" (
  "id" TEXT NOT NULL,
  "jobCode" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "trigger" TEXT NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 1,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt" TIMESTAMP(3),
  "error" TEXT,
  "metadata" JSONB,

  CONSTRAINT "JobRunLog_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'JobRunLog_jobCode_fkey'
  ) THEN
    ALTER TABLE "JobRunLog"
    ADD CONSTRAINT "JobRunLog_jobCode_fkey"
    FOREIGN KEY ("jobCode") REFERENCES "JobDefinition"("code")
    ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;
