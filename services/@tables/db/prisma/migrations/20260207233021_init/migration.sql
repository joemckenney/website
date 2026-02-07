-- CreateTable
CREATE TABLE "TableMeta" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TableMeta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TableEvent" (
    "id" BIGSERIAL NOT NULL,
    "tableId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "appliedToPg" BOOLEAN NOT NULL DEFAULT false,
    "appliedAt" TIMESTAMP(3),

    CONSTRAINT "TableEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TableCheckpoint" (
    "tableId" TEXT NOT NULL,
    "lastEventId" BIGINT NOT NULL,
    "checkpointAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TableCheckpoint_pkey" PRIMARY KEY ("tableId")
);

-- CreateIndex
CREATE INDEX "TableMeta_userId_idx" ON "TableMeta"("userId");

-- CreateIndex
CREATE INDEX "TableEvent_tableId_appliedToPg_idx" ON "TableEvent"("tableId", "appliedToPg");

-- CreateIndex
CREATE INDEX "TableEvent_appliedToPg_createdAt_idx" ON "TableEvent"("appliedToPg", "createdAt");
