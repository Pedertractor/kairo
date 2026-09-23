-- CreateEnum
CREATE TYPE "ApiKeyScope" AS ENUM ('INTEGRATION', 'OCCUPATION');

-- AlterTable
ALTER TABLE "api_keys" ADD COLUMN "scope" "ApiKeyScope" NOT NULL DEFAULT 'INTEGRATION';

-- CreateIndex
CREATE INDEX "api_keys_scope_revokedAt_idx" ON "api_keys"("scope", "revokedAt");
