-- AlterTable
ALTER TABLE "cards" ADD COLUMN "integrationSource" TEXT;
ALTER TABLE "cards" ADD COLUMN "deletedById" TEXT;

-- CreateIndex
CREATE INDEX "cards_deletedById_idx" ON "cards"("deletedById");

-- AddForeignKey
ALTER TABLE "cards" ADD CONSTRAINT "cards_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
