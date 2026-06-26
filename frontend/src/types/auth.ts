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
}

export interface AuthResponse {
  token: string
  user: User
}

export interface MeResponse {
  user: User
}

export interface LoginCredentials {
  employeeId: string
  password: string
}
