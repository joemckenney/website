-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "sessionId" TEXT;

-- CreateTable
CREATE TABLE "StravaConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "scope" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StravaConnection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StravaConnection_userId_key" ON "StravaConnection"("userId");

-- CreateIndex
CREATE INDEX "StravaConnection_userId_idx" ON "StravaConnection"("userId");
