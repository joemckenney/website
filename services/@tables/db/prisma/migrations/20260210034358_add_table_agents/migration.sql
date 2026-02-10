-- CreateTable
CREATE TABLE "TableAgent" (
    "id" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "triggerType" TEXT NOT NULL,
    "watchColumns" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "inputColumns" TEXT[],
    "outputColumns" TEXT[],
    "prompt" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TableAgent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TableAgent_tableId_idx" ON "TableAgent"("tableId");

-- CreateIndex
CREATE INDEX "TableAgent_tableId_enabled_idx" ON "TableAgent"("tableId", "enabled");

-- AddForeignKey
ALTER TABLE "TableAgent" ADD CONSTRAINT "TableAgent_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "TableMeta"("id") ON DELETE CASCADE ON UPDATE CASCADE;
