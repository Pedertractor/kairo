-- AlterTable
ALTER TABLE "printing_machines" ADD COLUMN "activityId" TEXT;

-- CreateIndex
CREATE INDEX "printing_machines_activityId_idx" ON "printing_machines"("activityId");

-- AddForeignKey
ALTER TABLE "printing_machines" ADD CONSTRAINT "printing_machines_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "cards"("id") ON DELETE SET NULL ON UPDATE CASCADE;
