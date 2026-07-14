export type UnitType = 'PEDERTRACTOR' | 'TRACTOR'
export type UserRole = 'ADMIN' | 'USER'

export interface User {
  id: string
  employeeId: string
  name: string
  unit: UnitType
  cardNumber: string
  role: UserRole
  active: boolean
  firstLogin: boolean
  printerOperator: boolean
}

export interface AuthResponse {
  token: string
  user: User
}

export type LoginResponse =
  | { token: string; user: User; requiresPasswordChange?: false }
  | { user: User; requiresPasswordChange: true }

export interface MeResponse {
  user: User
}

export interface LoginCredentials {
  cardNumber: string
  unit: UnitType
  password: string
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
