ALTER TABLE "users" ADD COLUMN "authVersion" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "refresh_tokens" ADD COLUMN "authVersion" INTEGER NOT NULL DEFAULT 0;

CREATE TYPE "AccountActionPurpose" AS ENUM ('EMAIL_VERIFICATION', 'PASSWORD_RESET');

CREATE TABLE "user_emails" (
    "userId" TEXT NOT NULL,
    "email" VARCHAR(254),
    "verifiedAt" TIMESTAMP(3),
    "pendingEmail" VARCHAR(254),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "user_emails_pkey" PRIMARY KEY ("userId"),
    CONSTRAINT "user_emails_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "account_action_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "purpose" "AccountActionPurpose" NOT NULL,
    "targetEmail" VARCHAR(254) NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "authVersion" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "account_action_tokens_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "account_action_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "account_action_tokens_tokenHash_key" ON "account_action_tokens"("tokenHash");
CREATE INDEX "account_action_tokens_userId_createdAt_idx" ON "account_action_tokens"("userId", "createdAt");

INSERT INTO "user_emails" ("userId", "updatedAt")
SELECT "id", CURRENT_TIMESTAMP FROM "users" WHERE "production" = false;
