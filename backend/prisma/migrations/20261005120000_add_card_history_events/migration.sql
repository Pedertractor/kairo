-- CreateEnum
CREATE TYPE "CardHistoryEventType" AS ENUM ('ASSIGNEE_CHANGED');

-- CreateTable
CREATE TABLE "card_history_events" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "type" "CardHistoryEventType" NOT NULL,
    "changedById" TEXT NOT NULL,
    "fromAssignedToId" TEXT,
    "fromAssignedToName" TEXT,
    "toAssignedToId" TEXT,
    "toAssignedToName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "card_history_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "card_history_events_cardId_createdAt_idx" ON "card_history_events"("cardId", "createdAt");

-- AddForeignKey
ALTER TABLE "card_history_events" ADD CONSTRAINT "card_history_events_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "card_history_events" ADD CONSTRAINT "card_history_events_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
