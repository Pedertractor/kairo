-- AlterTable
ALTER TABLE "teams" ADD COLUMN     "membersCanCreateActivities" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "teams" ADD COLUMN     "membersCanCreateProjects" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "teams" ADD COLUMN     "membersCanViewTimeline" BOOLEAN NOT NULL DEFAULT true;
