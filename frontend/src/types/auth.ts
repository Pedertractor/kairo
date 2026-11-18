export type UnitType = 'PEDERTRACTOR' | 'TRACTOR'
export type UserRole = 'ADMIN' | 'SUPERVISOR' | 'LEADER' | 'USER'

export interface User {
  id: string
  employeeId: string
  name: string
  unit: UnitType
  cardNumber: string
  role: UserRole
  active: boolean
  firstLogin: boolean
  production: boolean
  absent: boolean
  absenceStartedAt: string | null
  absenceEndedAt: string | null
  shiftStart: string | null
  shiftEnd: string | null
  hasOwnedTeams: boolean
  hasTeams: boolean
  /** Only in a supervisor's user list: false for users seen read-only through the hierarchy. */
  managedByViewer?: boolean
}

export interface AuthResponse {
  token: string
  refreshToken: string
  user: User
}

export type LoginResponse =
  | { token: string; refreshToken: string; user: User; requiresPasswordChange?: false }
  | { user: User; requiresPasswordChange: true }

export interface MeResponse {
  user: User
}

export interface LoginCredentials {
  cardNumber: string
  unit: UnitType
  password: string
}

export type ProductionCredentials = Pick<LoginCredentials, 'cardNumber' | 'unit'>
export interface ProductionAuthResponse {
  token: string
  user: User
  expiresAt: string
}

export interface ChangePasswordInput {
  newPassword: string
  confirmPassword: string
}

export interface ChangePasswordPayload {
  cardNumber: string
  unit: UnitType
  currentPassword: string
  newPassword: string
  confirmPassword: string
}
