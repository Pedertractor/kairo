-- AlterTable
ALTER TABLE "teams" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "teams_active_idx" ON "teams"("active");
