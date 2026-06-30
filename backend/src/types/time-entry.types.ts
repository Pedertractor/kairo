import type { TimeEntry, TimeEntryType } from '../generated/client.js';

export interface TimeEntrySummary {
  id: string;
  cardId: string | null;
  taskId: string | null;
  userId: string;
  type: TimeEntryType;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ActiveTimerActivity {
  id: string;
  title: string;
  teamId: string;
}

export interface ActiveTimer {
  timeEntry: TimeEntrySummary;
  activity: ActiveTimerActivity;
}
