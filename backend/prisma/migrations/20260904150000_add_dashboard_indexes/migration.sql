-- DropIndex
-- Superseded by "time_entries_startedAt_endedAt_idx", which has the same prefix.
DROP INDEX "time_entries_startedAt_idx";

-- CreateIndex
CREATE INDEX "users_active_idx" ON "users"("active");

-- CreateIndex
CREATE INDEX "cards_deletedAt_type_status_idx" ON "cards"("deletedAt", "type", "status");

-- CreateIndex
CREATE INDEX "cards_deletedAt_teamId_type_idx" ON "cards"("deletedAt", "teamId", "type");

-- CreateIndex
CREATE INDEX "cards_deletedAt_createdAt_idx" ON "cards"("deletedAt", "createdAt");

-- CreateIndex
CREATE INDEX "tasks_createdById_idx" ON "tasks"("createdById");

-- CreateIndex
CREATE INDEX "tasks_deletedAt_status_idx" ON "tasks"("deletedAt", "status");

-- CreateIndex
CREATE INDEX "tasks_deletedAt_createdAt_idx" ON "tasks"("deletedAt", "createdAt");

-- CreateIndex
CREATE INDEX "time_entries_startedAt_endedAt_idx" ON "time_entries"("startedAt", "endedAt");

-- CreateIndex
CREATE INDEX "time_entries_userId_startedAt_idx" ON "time_entries"("userId", "startedAt");

-- CreateIndex
CREATE INDEX "time_entries_endedAt_type_idx" ON "time_entries"("endedAt", "type");
