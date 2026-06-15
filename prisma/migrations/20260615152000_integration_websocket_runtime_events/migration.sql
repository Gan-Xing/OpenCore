CREATE TABLE "IntegrationWebSocketRuntimeEvent" (
  "id" TEXT NOT NULL,
  "room" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "payloadPreview" JSONB NOT NULL,
  "traceId" TEXT,
  "deliveredCount" INTEGER NOT NULL,
  "status" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "IntegrationWebSocketRuntimeEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "IntegrationWebSocketRuntimeEvent_room_createdAt_idx"
  ON "IntegrationWebSocketRuntimeEvent"("room", "createdAt");

CREATE INDEX "IntegrationWebSocketRuntimeEvent_type_createdAt_idx"
  ON "IntegrationWebSocketRuntimeEvent"("type", "createdAt");

CREATE INDEX "IntegrationWebSocketRuntimeEvent_traceId_idx"
  ON "IntegrationWebSocketRuntimeEvent"("traceId");

CREATE INDEX "IntegrationWebSocketRuntimeEvent_createdAt_idx"
  ON "IntegrationWebSocketRuntimeEvent"("createdAt");
