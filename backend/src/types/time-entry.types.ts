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

export type RecentWorkItemKind = 'ACTIVITY' | 'PROJECT' | 'TASK';

export interface RecentWorkItem {
  kind: RecentWorkItemKind;
  id: string;
  title: string;
  teamId: string;
  teamName: string;
  status: string;
  parentTitle: string | null;
  lastWorkedAt: string;
  canStartTimer: boolean;
  activityId: string | null;
}

export interface DayTimelineBlock {
  id: string;
  title: string;
  kind: RecentWorkItemKind;
  teamId: string;
  startedAt: string;
  endedAt: string | null;
  isActive: boolean;
}

export interface DayDashboardStats {
  loggedSeconds: number;
  changePercent: number | null;
  uniqueCategories: number;
}

export interface DayDashboard {
  date: string;
  stats: DayDashboardStats;
  blocks: DayTimelineBlock[];
}
