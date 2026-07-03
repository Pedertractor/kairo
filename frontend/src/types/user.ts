import type { User, UserRole, UnitType } from '@/types/auth'

export interface UsersListResponse {
  users: User[]
}

export interface UserResponse {
  user: User
}

export interface UpdateUserRoleInput {
  role: UserRole
}

export interface CreateUserInput {
  cardNumber: string
  unit: UnitType
}

export interface EmployeeLookupResult {
  name: string
  cardNumber: string
  unit: UnitType
}

export interface EmployeeLookupResponse {
  employee: EmployeeLookupResult
}
