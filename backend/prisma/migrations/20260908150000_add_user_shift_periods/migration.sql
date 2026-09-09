-- CreateEnum
CREATE TYPE "ShiftSource" AS ENUM ('API', 'MANUAL');

-- CreateTable
CREATE TABLE "user_shift_periods" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startMinutes" INTEGER NOT NULL,
    "endMinutes" INTEGER NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "source" "ShiftSource" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_shift_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_jobs" (
    "name" TEXT NOT NULL,
    "lastRunAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_jobs_pkey" PRIMARY KEY ("name")
);

-- CreateIndex
CREATE INDEX "user_shift_periods_userId_startedAt_idx" ON "user_shift_periods"("userId", "startedAt");

-- CreateIndex
CREATE INDEX "user_shift_periods_userId_endedAt_idx" ON "user_shift_periods"("userId", "endedAt");

-- AddForeignKey
ALTER TABLE "user_shift_periods" ADD CONSTRAINT "user_shift_periods_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
