import { TeamRole } from '../generated/client.js';
import { AppError } from './errors.js';
import { MENSAGENS } from './response.js';

export type TeamMembershipAccess = {
  role: TeamRole;
  team: { active: boolean };
};

export function assertTeamMembership<T extends TeamMembershipAccess>(
  membership: T | null,
  options?: {
    allowInactiveAdmin?: boolean;
    forWrite?: boolean;
  },
): T {
  if (!membership) {
    throw new AppError(404, MENSAGENS.NAO_ENCONTRADO);
  }

  if (membership.team.active) {
    return membership;
  }

  if (options?.forWrite && membership.role === TeamRole.ADMIN) {
    throw new AppError(400, MENSAGENS.EQUIPE_INATIVA);
  }

  if (options?.allowInactiveAdmin && membership.role === TeamRole.ADMIN) {
    return membership;
  }

  throw new AppError(404, MENSAGENS.NAO_ENCONTRADO);
}
