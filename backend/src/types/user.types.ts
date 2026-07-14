import type { SafeUser } from './auth.types.js';

export interface UsersListResponse {
  users: SafeUser[];
}

export interface UserResponse {
  user: SafeUser;
}
