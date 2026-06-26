import type { UnitType, UserRole } from '../generated/client.js';

export interface SafeUser {
  id: string;
  employeeId: string;
  name: string;
  unit: UnitType;
  cardNumber: string;
  role: UserRole;
  active: boolean;
  firstLogin: boolean;
}

export interface LoginInput {
  cardNumber: string;
  unit: UnitType;
  password: string;
}

export interface AuthPayload {
  token: string;
  user: SafeUser;
}

export type LoginResponse =
  | { token: string; user: SafeUser; requiresPasswordChange?: false }
  | { user: SafeUser; requiresPasswordChange: true };

export interface ChangePasswordInput {
  cardNumber: string;
  unit: UnitType;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface JwtPayload {
  sub: string;
}
