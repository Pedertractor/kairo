-- DropForeignKey
ALTER TABLE "printing_machines" DROP CONSTRAINT "printing_machines_activityId_fkey";

-- DropIndex
DROP INDEX "printing_machines_activityId_idx";

-- AlterTable
ALTER TABLE "printing_machines" DROP COLUMN "activityId",
ADD COLUMN "threeDPartId" TEXT;

-- CreateIndex
CREATE INDEX "printing_machines_threeDPartId_idx" ON "printing_machines"("threeDPartId");

-- AddForeignKey
ALTER TABLE "printing_machines" ADD CONSTRAINT "printing_machines_threeDPartId_fkey" FOREIGN KEY ("threeDPartId") REFERENCES "three_d_parts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
