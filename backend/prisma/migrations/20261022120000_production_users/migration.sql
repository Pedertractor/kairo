ALTER TABLE "users" ADD COLUMN "production" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "production_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "production_sessions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "production_sessions_userId_idx" ON "production_sessions"("userId");
CREATE INDEX "production_sessions_lastActivityAt_idx" ON "production_sessions"("lastActivityAt");
ALTER TABLE "production_sessions" ADD CONSTRAINT "production_sessions_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
