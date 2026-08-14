-- CreateTable
CREATE TABLE "user_absence_periods" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_absence_periods_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_absence_periods_userId_startedAt_idx" ON "user_absence_periods"("userId", "startedAt");

-- CreateIndex
CREATE INDEX "user_absence_periods_userId_endedAt_idx" ON "user_absence_periods"("userId", "endedAt");

-- AddForeignKey
ALTER TABLE "user_absence_periods" ADD CONSTRAINT "user_absence_periods_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_absence_periods" ADD CONSTRAINT "user_absence_periods_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill open periods for users currently marked absent
INSERT INTO "user_absence_periods" ("id", "userId", "startedAt", "endedAt", "createdById", "createdAt", "updatedAt")
SELECT
    'abs_' || "id",
    "id",
    date_trunc('day', "updatedAt"),
    NULL,
    "id",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "users"
WHERE "absent" = true;
