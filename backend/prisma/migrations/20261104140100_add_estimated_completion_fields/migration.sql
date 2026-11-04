ALTER TABLE "cards" ADD COLUMN "completionDateEstimated" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "card_history_events"
  ALTER COLUMN "changedById" DROP NOT NULL,
  ADD COLUMN "estimatedCompletedAt" TIMESTAMP(3);

ALTER TABLE "card_history_events" ADD CONSTRAINT "card_history_actor_required"
  CHECK ("changedById" IS NOT NULL OR "type" = 'COMPLETION_ESTIMATED');
ALTER TABLE "card_history_events" ADD CONSTRAINT "card_history_estimate_valid"
  CHECK (CASE WHEN "type" = 'COMPLETION_ESTIMATED' THEN
    "changedById" IS NULL AND "estimatedCompletedAt" IS NOT NULL
    AND "fromStatus" IS NULL AND "toStatus" IS NOT DISTINCT FROM 'DONE'::"CardStatus"
    ELSE "estimatedCompletedAt" IS NULL END);
CREATE UNIQUE INDEX "card_history_one_completion_estimate"
  ON "card_history_events" ("cardId") WHERE "type" = 'COMPLETION_ESTIMATED';
