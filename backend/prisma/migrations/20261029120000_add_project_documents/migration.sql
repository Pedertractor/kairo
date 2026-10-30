ALTER TABLE "team_documents" ADD COLUMN "projectId" TEXT;
CREATE INDEX "team_documents_teamId_projectId_idx" ON "team_documents"("teamId", "projectId");
ALTER TABLE "team_documents" ADD CONSTRAINT "team_documents_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;
