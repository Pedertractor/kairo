export interface AbsenceUserOption {
  id: string
  name: string
}

export interface AbsenceListItem {
  id: string
  userId: string
  userName: string
  createdById: string
  createdByName: string
  startedAt: string
  endedAt: string | null
  createdAt: string
  canCancel: boolean
}

export interface AbsenceListResponse {
  absences: AbsenceListItem[]
  users: AbsenceUserOption[]
}
