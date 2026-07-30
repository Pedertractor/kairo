-- CreateTable
CREATE TABLE "tags" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "cards" ADD COLUMN "tagId" TEXT;

-- CreateIndex
CREATE INDEX "tags_teamId_idx" ON "tags"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "tags_teamId_name_key" ON "tags"("teamId", "name");

-- CreateIndex
CREATE INDEX "cards_tagId_idx" ON "cards"("tagId");

-- AddForeignKey
ALTER TABLE "tags" ADD CONSTRAINT "tags_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cards" ADD CONSTRAINT "cards_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tags"("id") ON DELETE SET NULL ON UPDATE CASCADE;
