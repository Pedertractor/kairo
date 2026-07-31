-- One-off cleanup for tasks left at IN_PROGRESS by the old exclusive-lock flow.
--
-- Task status used to double as a lock and could be orphaned when a start or
-- pause failed halfway through. Status is now reference counted, so any task
-- marked IN_PROGRESS with no running timer is stale and belongs in PAUSED.
UPDATE "tasks" AS t
SET "status" = 'PAUSED'
WHERE t."status" = 'IN_PROGRESS'
  AND NOT EXISTS (
    SELECT 1
    FROM "time_entries" AS e
    WHERE e."taskId" = t."id"
      AND e."endedAt" IS NULL
      AND e."type" = 'TIMER'
  );
