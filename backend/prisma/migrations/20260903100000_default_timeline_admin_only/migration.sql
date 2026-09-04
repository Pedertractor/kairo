-- AlterTable
ALTER TABLE "teams" ALTER COLUMN "membersCanViewTimeline" SET DEFAULT false;

UPDATE "teams" SET "membersCanViewTimeline" = false;
