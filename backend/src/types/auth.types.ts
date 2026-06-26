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

export interface JwtPayload {
  sub: string;
}
