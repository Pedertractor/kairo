import type { User, UserRole } from '@/types/auth'

export interface UsersListResponse {
  users: User[]
}

export interface UserResponse {
  user: User
}

export interface UpdateUserRoleInput {
  role: UserRole
}
