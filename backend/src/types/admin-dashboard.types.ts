export interface AdminDashboardUserOption {
  id: string;
  name: string;
  employeeId: string;
  unit: 'PEDERTRACTOR' | 'TRACTOR';
  role: 'ADMIN' | 'LEADER' | 'USER';
  active: boolean;
  absent: boolean;
}

export interface AdminNamedCount {
  key: string;
  label: string;
  count: number;
}

export interface AdminStatusCount {
  status: string;
  count: number;
}

export interface AdminDailyUsage {
  date: string;
  loggedSeconds: number;
  entryCount: number;
  activeUserCount: number;
}

export interface AdminUserUsage {
  userId: string;
  name: string;
  role: 'ADMIN' | 'LEADER' | 'USER';
  unit: 'PEDERTRACTOR' | 'TRACTOR';
  active: boolean;
  loggedSeconds: number;
  timeEntryCount: number;
  availabilitySeconds: number;
  utilizationPercent: number;
}

export interface AdminTeamUsage {
  teamId: string;
  name: string;
  active: boolean;
  memberCount: number;
  projectCount: number;
  activityCount: number;
  loggedSeconds: number;
  timeEntryCount: number;
}

export interface AdminEntryTypeUsage {
  type: 'TIMER' | 'MANUAL';
  count: number;
  loggedSeconds: number;
}

export interface AdminRunningTimer {
  id: string;
  userId: string;
  userName: string;
  startedAt: string;
  itemTitle: string;
  itemKind: 'activity' | 'task' | 'project';
}

export interface AdminDashboard {
  startDate: string;
  endDate: string;
  users: AdminDashboardUserOption[];
  selectedUser: AdminDashboardUserOption | null;
  summary: {
    userCount: number;
    activeUsers: number;
    inactiveUsers: number;
    absentUsers: number;
    pendingFirstLogin: number;
    usersWithEntries: number;
    teamCount: number;
    activeTeams: number;
    inactiveTeams: number;
    projectCount: number;
    activityCount: number;
    taskCount: number;
    clientCount: number;
    documentCount: number;
    loggedSeconds: number;
    availabilitySeconds: number;
    remainingSeconds: number;
    utilizationPercent: number;
    timeEntryCount: number;
    averageEntrySeconds: number;
    runningTimerCount: number;
    createdProjects: number;
    createdActivities: number;
    createdTasks: number;
    createdUsers: number;
  };
  usersByRole: AdminNamedCount[];
  usersByUnit: AdminNamedCount[];
  projectStatus: AdminStatusCount[];
  activityStatus: AdminStatusCount[];
  taskStatus: AdminStatusCount[];
  daily: AdminDailyUsage[];
  topUsers: AdminUserUsage[];
  teams: AdminTeamUsage[];
  entryTypes: AdminEntryTypeUsage[];
  runningTimers: AdminRunningTimer[];
}
