-- AlterTable
ALTER TABLE "cost_centers"
  ADD COLUMN "group" TEXT,
  ADD COLUMN "productive" BOOLEAN,
  ADD COLUMN "leaderDayCard" TEXT,
  ADD COLUMN "leaderDayName" TEXT,
  ADD COLUMN "leaderNightCard" TEXT,
  ADD COLUMN "leaderNightName" TEXT,
  ADD COLUMN "supervisorDayCard" TEXT,
  ADD COLUMN "supervisorDayName" TEXT,
  ADD COLUMN "supervisorNightCard" TEXT,
  ADD COLUMN "supervisorNightName" TEXT,
  ADD COLUMN "managerCard" TEXT,
  ADD COLUMN "managerName" TEXT;

-- CreateIndex
CREATE INDEX "cost_centers_supervisorDayCard_idx" ON "cost_centers"("supervisorDayCard");
CREATE INDEX "cost_centers_supervisorNightCard_idx" ON "cost_centers"("supervisorNightCard");
