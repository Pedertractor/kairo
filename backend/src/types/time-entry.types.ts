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

export interface ActiveTimerTask {
  id: string;
  title: string;
  teamId: string;
  projectId: string;
  projectTitle: string;
}

export interface ActiveTimer {
  timeEntry: TimeEntrySummary;
  activity?: ActiveTimerActivity;
  task?: ActiveTimerTask;
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

export interface TaskTimeEntrySummary {
  id: string;
  userId: string;
  userName: string;
  type: TimeEntryType;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number | null;
  note: string | null;
}

export interface PaginatedTaskTimeEntries {
  timeEntries: TaskTimeEntrySummary[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface UserTimeEntrySummary {
  id: string;
  type: TimeEntryType;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number | null;
  note: string | null;
  kind: RecentWorkItemKind;
  title: string;
  parentTitle: string | null;
  teamId: string;
  teamName: string;
  activityId: string | null;
  projectId: string | null;
  taskId: string | null;
}

export interface PaginatedUserTimeEntries {
  timeEntries: UserTimeEntrySummary[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}
