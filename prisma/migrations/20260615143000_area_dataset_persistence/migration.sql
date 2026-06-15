CREATE TABLE "AreaDatasetVersion" (
  "id" TEXT NOT NULL,
  "version" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "checksum" TEXT NOT NULL,
  "importedAt" TIMESTAMP(3) NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AreaDatasetVersion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AreaDatasetVersion_version_key"
  ON "AreaDatasetVersion"("version");

CREATE INDEX "AreaDatasetVersion_active_importedAt_idx"
  ON "AreaDatasetVersion"("active", "importedAt");

CREATE INDEX "AreaDatasetVersion_importedAt_idx"
  ON "AreaDatasetVersion"("importedAt");

CREATE TABLE "AreaRegion" (
  "id" TEXT NOT NULL,
  "datasetVersion" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "parentCode" TEXT,
  "level" INTEGER NOT NULL,
  "path" JSONB NOT NULL,
  "aliases" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AreaRegion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AreaRegion_datasetVersion_code_key"
  ON "AreaRegion"("datasetVersion", "code");

CREATE INDEX "AreaRegion_datasetVersion_parentCode_idx"
  ON "AreaRegion"("datasetVersion", "parentCode");

CREATE INDEX "AreaRegion_datasetVersion_level_idx"
  ON "AreaRegion"("datasetVersion", "level");

CREATE TABLE "AreaIpRange" (
  "id" TEXT NOT NULL,
  "datasetVersion" TEXT NOT NULL,
  "regionCode" TEXT NOT NULL,
  "cidr" TEXT NOT NULL,
  "start" BIGINT NOT NULL,
  "end" BIGINT NOT NULL,
  "startIp" TEXT NOT NULL,
  "endIp" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AreaIpRange_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AreaIpRange_datasetVersion_regionCode_idx"
  ON "AreaIpRange"("datasetVersion", "regionCode");

CREATE INDEX "AreaIpRange_datasetVersion_start_end_idx"
  ON "AreaIpRange"("datasetVersion", "start", "end");

ALTER TABLE "AreaRegion"
  ADD CONSTRAINT "AreaRegion_datasetVersion_fkey"
  FOREIGN KEY ("datasetVersion")
  REFERENCES "AreaDatasetVersion"("version")
  ON DELETE CASCADE
  ON UPDATE CASCADE;

ALTER TABLE "AreaIpRange"
  ADD CONSTRAINT "AreaIpRange_datasetVersion_fkey"
  FOREIGN KEY ("datasetVersion")
  REFERENCES "AreaDatasetVersion"("version")
  ON DELETE CASCADE
  ON UPDATE CASCADE;
