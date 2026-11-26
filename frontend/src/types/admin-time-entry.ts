import type { UserRole } from '@/types/auth'
import type { TeamTimeEntrySummary } from '@/types/time-entry'

export type AdminTimeEntry = TeamTimeEntrySummary

export interface AdminTimeEntriesResponse {
  timeEntries: AdminTimeEntry[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

export interface AdminTimeEntryResponse {
  timeEntry: AdminTimeEntry
}

export interface AdminTimeEntryUserOption {
  id: string
  name: string
  employeeId: string
  active: boolean
  role: UserRole
}

export interface AdminTimeEntryUsersResponse {
  users: AdminTimeEntryUserOption[]
}

export type AdminWorkItemKind = 'ACTIVITY' | 'TASK'

export interface AdminWorkItem {
  kind: AdminWorkItemKind
  id: string
  title: string
  parentTitle: string | null
  status: string
  teamId: string
  teamName: string
}

export interface AdminWorkItemsResponse {
  workItems: AdminWorkItem[]
}

export type AdminTimeEntryAuditAction = 'CREATE' | 'UPDATE' | 'DELETE'

export interface AdminTimeEntryAuditSnapshot {
  cardId: string | null
  taskId: string | null
  startedAt: string
  endedAt: string | null
  durationSeconds: number | null
  note: string | null
  type: string
}

export interface AdminTimeEntryAuditLog {
  id: string
  action: AdminTimeEntryAuditAction
  actorId: string
  actorName: string
  before: AdminTimeEntryAuditSnapshot | null
  after: AdminTimeEntryAuditSnapshot | null
  createdAt: string
}

export interface AdminTimeEntryAuditResponse {
  auditLogs: AdminTimeEntryAuditLog[]
}
