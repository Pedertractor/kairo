import type { UnitType, User } from '../generated/client.js';
import type { SafeUser } from '../types/auth.types.js';

export function toEmployeeId(unit: UnitType, cardNumber: string): string {
  return `${unit}-${cardNumber}`;
}

export function toSafeUser(
  user: User,
  hasOwnedTeams = false,
  hasTeams = false,
  currentAbsence?: { startedAt: Date; endedAt: Date | null } | null,
): SafeUser {
  return {
    id: user.id,
    employeeId: user.employeeId,
    name: user.name,
    unit: user.unit,
    cardNumber: user.cardNumber,
    role: user.role,
    active: user.active,
    firstLogin: user.firstLogin,
    absent: currentAbsence === undefined ? user.absent : Boolean(currentAbsence),
    absenceStartedAt: currentAbsence?.startedAt.toISOString() ?? null,
    absenceEndedAt: currentAbsence?.endedAt?.toISOString() ?? null,
    hasOwnedTeams,
    hasTeams,
  };
}
