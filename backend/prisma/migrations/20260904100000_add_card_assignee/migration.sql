-- AlterTable
ALTER TABLE "cards" ADD COLUMN     "assignedToId" TEXT;

-- CreateIndex
CREATE INDEX "cards_assignedToId_idx" ON "cards"("assignedToId");

-- AddForeignKey
ALTER TABLE "cards" ADD CONSTRAINT "cards_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
