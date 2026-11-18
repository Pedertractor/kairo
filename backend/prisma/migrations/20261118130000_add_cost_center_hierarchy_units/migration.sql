-- AlterTable
ALTER TABLE "cost_centers"
  ADD COLUMN "leaderDayUnit" "UnitType",
  ADD COLUMN "leaderNightUnit" "UnitType",
  ADD COLUMN "supervisorDayUnit" "UnitType",
  ADD COLUMN "supervisorNightUnit" "UnitType",
  ADD COLUMN "managerUnit" "UnitType";
