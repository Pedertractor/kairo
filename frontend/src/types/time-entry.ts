export type TimeEntryType = 'TIMER' | 'MANUAL'

export interface TimeEntrySummary {
  id: string
  cardId: string | null
  taskId: string | null
  userId: string
  type: TimeEntryType
  startedAt: string
  endedAt: string | null
  durationSeconds: number | null
  note: string | null
  createdAt: string
  updatedAt: string
}

export interface ActiveTimerActivity {
  id: string
  title: string
  teamId: string
}

export interface ActiveTimer {
  timeEntry: TimeEntrySummary
  activity: ActiveTimerActivity
}

export interface ActiveTimerResponse {
  activeTimer: ActiveTimer | null
}

export interface StartTimerResponse {
  activeTimer: ActiveTimer
}

export interface PauseTimerResponse {
  timeEntry: TimeEntrySummary
}

export type RecentWorkItemKind = 'ACTIVITY' | 'PROJECT' | 'TASK'

export interface RecentWorkItem {
  kind: RecentWorkItemKind
  id: string
  title: string
  teamId: string
  teamName: string
  status: string
  parentTitle: string | null
  lastWorkedAt: string
  canStartTimer: boolean
  activityId: string | null
}

export interface RecentWorkItemsResponse {
  items: RecentWorkItem[]
}
