-- AlterTable
ALTER TABLE "teams" ADD COLUMN     "membersCanEditTags" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "teams" ADD COLUMN     "membersCanDeleteTags" BOOLEAN NOT NULL DEFAULT true;
