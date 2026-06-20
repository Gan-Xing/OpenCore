ALTER TABLE "User" ADD COLUMN "remark" TEXT;
ALTER TABLE "User" ADD COLUMN "forcePasswordChange" BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX "User_mobile_key" ON "User"("mobile");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
