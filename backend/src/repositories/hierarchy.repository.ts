import { UserRole, type PrismaClient, type UnitType } from '../generated/client.js';
import {
  collectSupervisorLeaderLinks,
  type HierarchyPerson,
  type SupervisorLeaderLink,
} from '../utils/cost-center-hierarchy.js';

type HierarchyUser = {
  id: string;
  name: string;
  unit: UnitType;
  cardNumber: string;
  role: UserRole;
  active: boolean;
};

export interface ResolvedLeader extends SupervisorLeaderLink {
  user: HierarchyUser | null;
}

const hierarchySelect = {
  costCenter: true,
  description: true,
  group: true,
  leaderDayCard: true,
  leaderDayName: true,
  leaderDayUnit: true,
  leaderNightCard: true,
  leaderNightName: true,
  leaderNightUnit: true,
  supervisorDayCard: true,
  supervisorDayName: true,
  supervisorDayUnit: true,
  supervisorNightCard: true,
  supervisorNightName: true,
  supervisorNightUnit: true,
} as const;

const userSelect = {
  id: true,
  name: true,
  unit: true,
  cardNumber: true,
  role: true,
  active: true,
} as const;

/** A Kairo user as a hierarchy person: unit + badge, the same key as `User @@unique([unit, cardNumber])`. */
export function toHierarchyPerson(user: { unit: UnitType; cardNumber: string }): HierarchyPerson {
  return { unit: user.unit, card: user.cardNumber };
}

/**
 * Supervisor → leader links come from the cost centers synced from the base API,
 * where each badge already carries the unit resolved at sync time.
 */
export class HierarchyRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findLeadersOfSupervisor(supervisor: HierarchyPerson): Promise<ResolvedLeader[]> {
    const rows = await this.prisma.costCenter.findMany({
      // A missing night/day supervisor falls back to the other shift, so any cost
      // center where this person supervises either shift is relevant.
      where: {
        OR: [
          { supervisorDayCard: supervisor.card, supervisorDayUnit: supervisor.unit },
          { supervisorNightCard: supervisor.card, supervisorNightUnit: supervisor.unit },
        ],
      },
      select: hierarchySelect,
    });
    const links = collectSupervisorLeaderLinks(rows, supervisor);
    const keys = links.flatMap((link) =>
      link.leaderUnit ? [{ unit: link.leaderUnit, cardNumber: link.leaderCard }] : [],
    );
    const users =
      keys.length === 0
        ? []
        : await this.prisma.user.findMany({
            where: { active: true, OR: keys },
            select: userSelect,
          });

    return links.map((link) => ({
      ...link,
      user:
        users.find(
          (user) =>
            user.unit === link.leaderUnit && user.cardNumber === link.leaderCard,
        ) ?? null,
    }));
  }

  async findLeaderUserIdsOfSupervisor(supervisor: HierarchyPerson): Promise<string[]> {
    const leaders = await this.findLeadersOfSupervisor(supervisor);
    return leaders.flatMap((leader) => (leader.user ? [leader.user.id] : []));
  }

  /** Active teams where any of the given users is a team admin. */
  findTeamsOwnedBy(userIds: string[]) {
    if (userIds.length === 0) {
      return Promise.resolve([]);
    }

    return this.prisma.teamMember.findMany({
      where: { userId: { in: userIds }, role: 'ADMIN', team: { active: true } },
      select: {
        userId: true,
        team: {
          select: {
            id: true,
            members: { select: { userId: true } },
          },
        },
      },
    });
  }

  findSupervisors() {
    return this.prisma.user.findMany({
      where: { role: UserRole.SUPERVISOR, active: true },
      select: userSelect,
      orderBy: { name: 'asc' },
    });
  }

  findUserById(userId: string) {
    return this.prisma.user.findUnique({ where: { id: userId }, select: userSelect });
  }

  /**
   * Grants SUPERVISOR to existing USER/LEADER accounts (matched by unit + badge)
   * that supervise someone. Never touches ADMINs or production logins, never demotes.
   */
  async promoteSupervisors(supervisors: HierarchyPerson[]) {
    if (supervisors.length === 0) {
      return { promoted: [] as string[] };
    }

    const users = await this.prisma.user.findMany({
      where: {
        active: true,
        production: false,
        role: { in: [UserRole.USER, UserRole.LEADER] },
        OR: supervisors.map(({ unit, card }) => ({ unit, cardNumber: card })),
      },
      select: { id: true },
    });

    for (const user of users) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { role: UserRole.SUPERVISOR },
      });
    }

    return { promoted: users.map(({ id }) => id) };
  }
}
