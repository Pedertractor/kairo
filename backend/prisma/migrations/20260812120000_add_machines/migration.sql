-- CreateTable
CREATE TABLE "machines" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "costCenter" TEXT NOT NULL,

    CONSTRAINT "machines_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "cards" ADD COLUMN "machineId" TEXT;

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN "machineId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "machines_name_key" ON "machines"("name");

-- CreateIndex
CREATE INDEX "cards_machineId_idx" ON "cards"("machineId");

-- CreateIndex
CREATE INDEX "tasks_machineId_idx" ON "tasks"("machineId");

-- AddForeignKey
ALTER TABLE "cards" ADD CONSTRAINT "cards_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "machines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "machines"("id") ON DELETE SET NULL ON UPDATE CASCADE;
