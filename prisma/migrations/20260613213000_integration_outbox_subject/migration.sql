ALTER TABLE "IntegrationOutbox"
  ADD COLUMN "subject" TEXT;

UPDATE "IntegrationOutbox"
SET "subject" = CASE
  WHEN "channel" = 'mail'
       AND "templateCode" = 'mail.welcome'
       AND "payload" ? 'name'
    THEN 'Welcome ' || ("payload" ->> 'name')
  WHEN "channel" = 'mail'
       AND "payload" ? 'subject'
    THEN NULLIF(BTRIM("payload" ->> 'subject'), '')
  WHEN "channel" = 'mail'
       AND "payload" ? 'title'
    THEN NULLIF(BTRIM("payload" ->> 'title'), '')
  ELSE NULL
END
WHERE "channel" = 'mail';
