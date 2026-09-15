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
  projectId: string | null;
  taskId: string | null;
}

export interface DayTimelineTag {
  id: string;
  name: string;
  color: string;
}

export interface DayTimelineBlock {
  id: string;
  title: string;
  kind: RecentWorkItemKind;
  teamId: string;
  tag: DayTimelineTag | null;
  startedAt: string;
  endedAt: string | null;
  isActive: boolean;
}

export interface DayDashboardStats {
  loggedSeconds: number;
  changePercent: number | null;
  uniqueCategories: number;
}

export interface DayAbsenceBlock {
  id: string;
  startedAt: string;
  endedAt: string | null;
}

export interface DayDashboard {
  date: string;
  stats: DayDashboardStats;
  blocks: DayTimelineBlock[];
  absences: DayAbsenceBlock[];
}

export interface TeamDayTimelineBlock extends DayTimelineBlock {
  userId: string;
  userName: string;
}

export interface TeamDayDashboardStats {
  loggedSeconds: number;
  changePercent: number | null;
  activeMembers: number;
}

export interface TeamDayAbsenceBlock extends DayAbsenceBlock {
  userId: string;
  userName: string;
}

export interface TeamDayDashboard {
  date: string;
  stats: TeamDayDashboardStats;
  blocks: TeamDayTimelineBlock[];
  absences: TeamDayAbsenceBlock[];
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

export interface TeamTimeEntrySummary extends UserTimeEntrySummary {
  userId: string;
  userName: string;
}

export interface PaginatedTeamTimeEntries {
  timeEntries: TeamTimeEntrySummary[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}
