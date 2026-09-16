export interface AnalyticsTeamOption {
  id: string;
  name: string;
}

export interface AnalyticsEmployeeOption {
  id: string;
  name: string;
}

export interface AnalyticsProjectOption {
  id: string;
  title: string;
  teamId: string;
  teamName: string;
}

export interface ProjectUserAnalytics {
  employeeId: string;
  employeeName: string;
  spentSeconds: number;
  estimatedTimePercent: number | null;
}

export interface ProjectAnalytics {
  id: string;
  title: string;
  teamId: string;
  teamName: string;
  estimatedSeconds: number | null;
  spentSeconds: number;
  estimatedTimePercent: number | null;
  users: ProjectUserAnalytics[];
}

export interface EmployeeDayAnalytics {
  employeeId: string;
  employeeName: string;
  teamId: string;
  teamNames: string[];
  availabilitySeconds: number;
  loggedSeconds: number;
  remainingSeconds: number;
  timeEntryCount: number;
  utilizationPercent: number;
}

export interface ActivityTypeMemberAnalytics {
  employeeId: string;
  employeeName: string;
  entryCount: number;
  loggedSeconds: number;
}

export interface ActivityTypeAnalytics {
  tagId: string | null;
  tagName: string;
  tagColor: string | null;
  entryCount: number;
  activityCount: number;
  loggedSeconds: number;
  members: ActivityTypeMemberAnalytics[];
}

export interface ClientAnalytics {
  clientId: string | null;
  clientName: string;
  activityCount: number;
  taskCount: number;
  entryCount: number;
  loggedSeconds: number;
}

export type AnalyticsCardStatus =
  | 'TODO'
  | 'IN_PROGRESS'
  | 'PAUSED'
  | 'DONE'
  | 'CANCELED';

export interface ActivityStatusCount {
  status: AnalyticsCardStatus;
  count: number;
}

export interface ActivityTagOverview {
  tagId: string | null;
  tagName: string;
  tagColor: string | null;
  count: number;
  createdInPeriod: number;
  byStatus: ActivityStatusCount[];
}

export interface WorkItemStatusOverview {
  total: number;
  createdInPeriod: number;
  byStatus: ActivityStatusCount[];
}

export interface ActivityOverview {
  activities: WorkItemStatusOverview;
  projects: WorkItemStatusOverview;
  tasks: WorkItemStatusOverview;
  byTag: ActivityTagOverview[];
}

export interface AnalyticsAllTimeTotals {
  activityCount: number;
  projectCount: number;
  taskCount: number;
}

export type AnalyticsComplexityLevel =
  | 'BAIXA'
  | 'MEDIA'
  | 'ALTA'
  | 'MUITO_ALTA';

export interface MemberFinishedActivityComplexity {
  complexityLevel: AnalyticsComplexityLevel | null;
  count: number;
  weightedScore: number;
}

export interface MemberFinishedActivityAnalytics {
  employeeId: string;
  employeeName: string;
  activityCount: number;
  weightedScore: number;
  byComplexity: MemberFinishedActivityComplexity[];
}

export interface AnalyticsDashboard {
  startDate: string;
  endDate: string;
  teams: AnalyticsTeamOption[];
  employees: AnalyticsEmployeeOption[];
  projects: AnalyticsProjectOption[];
  selectedProject: ProjectAnalytics | null;
  summary: {
    availabilitySeconds: number;
    loggedSeconds: number;
    remainingSeconds: number;
    timeEntryCount: number;
    utilizationPercent: number;
  };
  rows: EmployeeDayAnalytics[];
  activityTypes: ActivityTypeAnalytics[];
  clients: ClientAnalytics[];
  activityOverview: ActivityOverview;
  activityOverviewAllTime: ActivityOverview;
  allTimeTotals: AnalyticsAllTimeTotals;
  memberFinishedActivities: MemberFinishedActivityAnalytics[];
}
