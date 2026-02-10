/*
  Warnings:

  - Added the required column `baseId` to the `TableMeta` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "TableMeta" ADD COLUMN     "baseId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "Base" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Base_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterializedColumn" (
    "id" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dataType" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "options" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaterializedColumn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterializedRow" (
    "id" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaterializedRow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Base_userId_idx" ON "Base"("userId");

-- CreateIndex
CREATE INDEX "MaterializedColumn_tableId_idx" ON "MaterializedColumn"("tableId");

-- CreateIndex
CREATE INDEX "MaterializedRow_tableId_idx" ON "MaterializedRow"("tableId");

-- CreateIndex
CREATE INDEX "MaterializedRow_tableId_createdAt_idx" ON "MaterializedRow"("tableId", "createdAt");

-- CreateIndex
CREATE INDEX "TableMeta_baseId_idx" ON "TableMeta"("baseId");

-- AddForeignKey
ALTER TABLE "TableMeta" ADD CONSTRAINT "TableMeta_baseId_fkey" FOREIGN KEY ("baseId") REFERENCES "Base"("id") ON DELETE CASCADE ON UPDATE CASCADE;
