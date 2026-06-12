CREATE TABLE "UserPost" (
    "userId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,

    CONSTRAINT "UserPost_pkey" PRIMARY KEY ("userId","postId")
);

ALTER TABLE "UserPost" ADD CONSTRAINT "UserPost_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserPost" ADD CONSTRAINT "UserPost_postId_fkey"
FOREIGN KEY ("postId") REFERENCES "SystemPost"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
