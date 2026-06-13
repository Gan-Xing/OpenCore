ALTER TABLE "LoginLog"
ADD COLUMN "location" TEXT NOT NULL DEFAULT 'Unknown';

UPDATE "LoginLog"
SET "location" = CASE
  WHEN "ip" IN ('127.0.0.1', '::1', '::ffff:127.0.0.1') THEN 'Loopback'
  WHEN "ip" LIKE '10.%'
    OR "ip" LIKE '192.168.%'
    OR "ip" LIKE '172.16.%'
    OR "ip" LIKE '172.17.%'
    OR "ip" LIKE '172.18.%'
    OR "ip" LIKE '172.19.%'
    OR "ip" LIKE '172.20.%'
    OR "ip" LIKE '172.21.%'
    OR "ip" LIKE '172.22.%'
    OR "ip" LIKE '172.23.%'
    OR "ip" LIKE '172.24.%'
    OR "ip" LIKE '172.25.%'
    OR "ip" LIKE '172.26.%'
    OR "ip" LIKE '172.27.%'
    OR "ip" LIKE '172.28.%'
    OR "ip" LIKE '172.29.%'
    OR "ip" LIKE '172.30.%'
    OR "ip" LIKE '172.31.%'
    OR LOWER("ip") LIKE 'fc%'
    OR LOWER("ip") LIKE 'fd%' THEN 'Private network'
  WHEN "ip" LIKE '169.254.%' OR LOWER("ip") LIKE 'fe80:%' THEN 'Link-local'
  ELSE 'Unknown'
END;
