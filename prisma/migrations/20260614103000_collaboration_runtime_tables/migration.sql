-- Round 102: create collaboration runtime tables used by live Admin flows.
CREATE TABLE "CollaborationMessage" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "sender" TEXT NOT NULL,
  "recipient" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'unread',
  "businessType" TEXT,
  "businessId" TEXT,
  "readAt" TIMESTAMP(3),
  "archivedAt" TIMESTAMP(3),
  "deletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CollaborationMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CollaborationMessage_recipient_status_createdAt_idx"
  ON "CollaborationMessage"("recipient", "status", "createdAt");

CREATE INDEX "CollaborationMessage_sender_createdAt_idx"
  ON "CollaborationMessage"("sender", "createdAt");

CREATE INDEX "CollaborationMessage_businessType_businessId_idx"
  ON "CollaborationMessage"("businessType", "businessId");

CREATE INDEX "CollaborationMessage_deletedAt_idx"
  ON "CollaborationMessage"("deletedAt");

CREATE TABLE "CollaborationNotice" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "targetAudience" JSONB NOT NULL,
  "validFrom" TIMESTAMP(3),
  "validTo" TIMESTAMP(3),
  "publishedAt" TIMESTAMP(3),
  "archivedAt" TIMESTAMP(3),
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CollaborationNotice_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CollaborationNotice_status_createdAt_idx"
  ON "CollaborationNotice"("status", "createdAt");

CREATE INDEX "CollaborationNotice_createdBy_createdAt_idx"
  ON "CollaborationNotice"("createdBy", "createdAt");

CREATE TABLE "CollaborationTodo" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "sourceType" TEXT NOT NULL,
  "businessType" TEXT,
  "businessId" TEXT,
  "assignee" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "timeline" JSONB NOT NULL,
  "completedAt" TIMESTAMP(3),
  "canceledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CollaborationTodo_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CollaborationTodo_assignee_status_createdAt_idx"
  ON "CollaborationTodo"("assignee", "status", "createdAt");

CREATE INDEX "CollaborationTodo_sourceType_status_idx"
  ON "CollaborationTodo"("sourceType", "status");

CREATE INDEX "CollaborationTodo_businessType_businessId_idx"
  ON "CollaborationTodo"("businessType", "businessId");

CREATE TABLE "CollaborationApprovalLite" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "requester" TEXT NOT NULL,
  "approver" TEXT NOT NULL,
  "businessType" TEXT,
  "businessId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "comment" TEXT,
  "timeline" JSONB NOT NULL,
  "decidedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CollaborationApprovalLite_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CollaborationApprovalLite_requester_status_createdAt_idx"
  ON "CollaborationApprovalLite"("requester", "status", "createdAt");

CREATE INDEX "CollaborationApprovalLite_approver_status_createdAt_idx"
  ON "CollaborationApprovalLite"("approver", "status", "createdAt");

CREATE INDEX "CollaborationApprovalLite_businessType_businessId_idx"
  ON "CollaborationApprovalLite"("businessType", "businessId");
