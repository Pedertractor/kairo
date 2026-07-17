export interface AnalyticsTeamOption {
  id: string
  name: string
}

export interface AnalyticsEmployeeOption {
  id: string
  name: string
}

export interface EmployeeDayAnalytics {
  employeeId: string
  employeeName: string
  teamNames: string[]
  availabilitySeconds: number
  loggedSeconds: number
  remainingSeconds: number
  timeEntryCount: number
  utilizationPercent: number
}

export interface AnalyticsDashboard {
  date: string
  teams: AnalyticsTeamOption[]
  employees: AnalyticsEmployeeOption[]
  summary: {
    availabilitySeconds: number
    loggedSeconds: number
    remainingSeconds: number
    timeEntryCount: number
    utilizationPercent: number
  }
  rows: EmployeeDayAnalytics[]
}
