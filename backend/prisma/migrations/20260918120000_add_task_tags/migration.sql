-- AlterTable
ALTER TABLE "tasks" ADD COLUMN "tagId" TEXT;

-- CreateIndex
CREATE INDEX "tasks_tagId_idx" ON "tasks"("tagId");

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tags"("id") ON DELETE SET NULL ON UPDATE CASCADE;
