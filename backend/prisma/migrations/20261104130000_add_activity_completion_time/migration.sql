ALTER TABLE "cards" ADD COLUMN "completedAt" TIMESTAMP(3);

-- Recover known completion times without treating later edits as completion.
UPDATE "cards" AS card
SET "completedAt" = (
  SELECT MAX(event."createdAt")
  FROM "card_history_events" AS event
  WHERE event."cardId" = card."id"
    AND event."type" = 'STATUS_CHANGED'
    AND event."toStatus" = 'DONE'
)
WHERE card."type" = 'ACTIVITY' AND card."status" = 'DONE';
