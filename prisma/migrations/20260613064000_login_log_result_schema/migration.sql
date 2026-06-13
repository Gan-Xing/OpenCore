ALTER TABLE "LoginLog"
  ADD COLUMN "logType" TEXT NOT NULL DEFAULT 'login.username',
  ADD COLUMN "result" TEXT NOT NULL DEFAULT 'success';

UPDATE "LoginLog"
SET "result" = CASE
  WHEN "success" = true THEN 'success'
  ELSE 'bad_credentials'
END;
