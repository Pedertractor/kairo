import type { User } from '../generated/client.js';
import type { SafeUser } from '../types/auth.types.js';

export function toSafeUser(user: User): SafeUser {
  return {
    id: user.id,
    employeeId: user.employeeId,
    name: user.name,
    unit: user.unit,
    cardNumber: user.cardNumber,
    role: user.role,
    active: user.active,
    firstLogin: user.firstLogin,
  };
}
