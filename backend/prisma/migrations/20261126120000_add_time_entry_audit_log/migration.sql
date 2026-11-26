-- CreateEnum
CREATE TYPE "TimeEntryAuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE');

-- CreateTable
CREATE TABLE "time_entry_audit_logs" (
    "id" TEXT NOT NULL,
    "timeEntryId" TEXT NOT NULL,
    "targetUserId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" "TimeEntryAuditAction" NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "time_entry_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "time_entry_audit_logs_timeEntryId_createdAt_idx" ON "time_entry_audit_logs"("timeEntryId", "createdAt");

-- CreateIndex
CREATE INDEX "time_entry_audit_logs_targetUserId_createdAt_idx" ON "time_entry_audit_logs"("targetUserId", "createdAt");

-- CreateIndex
CREATE INDEX "time_entry_audit_logs_actorId_idx" ON "time_entry_audit_logs"("actorId");

-- AddForeignKey
ALTER TABLE "time_entry_audit_logs" ADD CONSTRAINT "time_entry_audit_logs_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_entry_audit_logs" ADD CONSTRAINT "time_entry_audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
