ALTER TYPE "CardHistoryEventType" ADD VALUE 'STATUS_CHANGED';

ALTER TABLE "card_history_events"
ADD COLUMN "fromStatus" "CardStatus",
ADD COLUMN "toStatus" "CardStatus";
