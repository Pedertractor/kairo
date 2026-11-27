import type { Prisma, PrismaClient, UnitType, UserRole } from '../generated/client.js';
import { AppError } from '../utils/errors.js';
import { MENSAGENS } from '../utils/response.js';

export class UserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findByUnitAndCardNumber(unit: UnitType, cardNumber: string) {
    return this.prisma.user.findUnique({
      where: {
        unit_cardNumber: { unit, cardNumber },
      },
    });
  }

  findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async hasOwnedTeams(userId: string): Promise<boolean> {
    const ownedMembership = await this.prisma.teamMember.findFirst({
      where: { userId, role: 'ADMIN', team: { active: true } },
      select: { id: true },
    });

    return ownedMembership !== null;
  }

  async hasTeams(userId: string): Promise<boolean> {
    const membership = await this.prisma.teamMember.findFirst({
      where: { userId, team: { active: true } },
      select: { id: true },
    });

    return membership !== null;
  }

  findAvailableForTeam(teamId: string) {
    return this.prisma.user.findMany({
      where: {
        active: true,
        memberships: {
          none: { teamId },
        },
      },
      select: {
        id: true,
        name: true,
        employeeId: true,
        unit: true,
      },
      orderBy: [{ unit: 'asc' }, { name: 'asc' }],
    });
  }

  private async invalidateAccess(tx: Prisma.TransactionClient, userId: string) {
    const now = new Date();
    await tx.productionSession.deleteMany({ where: { userId } });
    await tx.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: now } });
    await tx.accountActionToken.updateMany({ where: { userId, usedAt: null }, data: { usedAt: now } });
  }

  private writePassword(id: string, passwordHash: string, firstLogin: boolean, authVersion?: number) {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id, ...(authVersion !== undefined ? { authVersion } : {}) },
        data: { passwordHash, firstLogin, authVersion: { increment: 1 } },
      });
      await this.invalidateAccess(tx, id);
      return user;
    }).catch((error: unknown) => {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
        throw new AppError(401, MENSAGENS.NAO_AUTORIZADO);
      }
      throw error;
    });
  }

  updatePassword(id: string, passwordHash: string, authVersion?: number) {
    return this.writePassword(id, passwordHash, false, authVersion);
  }

  findAll(options?: { active?: boolean }) {
    return this.prisma.user.findMany({
      where: options?.active !== undefined ? { active: options.active } : undefined,
      orderBy: [{ active: 'desc' }, { name: 'asc' }],
    });
  }

  findManagedByTeamAdmin(leaderUserId: string, options?: { active?: boolean }) {
    return this.findManagedByTeamAdmins([leaderUserId], options);
  }

  /**
   * Users in active teams administered by any of the given leaders. Admins and
   * supervisors sit above leaders, so they are never part of a leader's scope
   * even when they are members of the leader's teams.
   */
  findManagedByTeamAdmins(
    leaderUserIds: string[],
    options?: { active?: boolean },
  ) {
    if (leaderUserIds.length === 0) {
      return Promise.resolve([]);
    }

    return this.prisma.user.findMany({
      where: {
        ...(options?.active !== undefined ? { active: options.active } : {}),
        role: { notIn: ['ADMIN', 'SUPERVISOR'] },
        memberships: {
          some: {
            team: {
              active: true,
              members: {
                some: {
                  userId: { in: leaderUserIds },
                  role: 'ADMIN',
                },
              },
            },
          },
        },
      },
      orderBy: [{ active: 'desc' }, { name: 'asc' }],
    });
  }

  async canLeaderManageUser(leaderUserId: string, targetUserId: string) {
    const shared = await this.prisma.teamMember.findFirst({
      where: {
        userId: targetUserId,
        user: { role: { notIn: ['ADMIN', 'SUPERVISOR'] } },
        team: {
          active: true,
          members: {
            some: {
              userId: leaderUserId,
              role: 'ADMIN',
            },
          },
        },
      },
      select: { id: true },
    });

    return shared !== null;
  }

  createWithTeamMembership(
    data: {
      employeeId: string;
      name: string;
      unit: UnitType;
      cardNumber: string;
      passwordHash: string;
      role: UserRole;
      production?: boolean;
    },
    teamId: string,
    initialShift?: {
      startMinutes: number;
      endMinutes: number;
      source: 'API' | 'MANUAL';
    } | null,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({ data: { ...data, ...(!data.production ? { userEmail: { create: {} } } : {}) } });

      await tx.teamMember.create({
        data: {
          teamId,
          userId: user.id,
          role: 'MEMBER',
        },
      });

      if (initialShift) {
        await tx.userShiftPeriod.create({
          data: {
            userId: user.id,
            startMinutes: initialShift.startMinutes,
            endMinutes: initialShift.endMinutes,
            startedAt: new Date(),
            source: initialShift.source,
          },
        });
      }

      return user;
    });
  }

  updateRole(
    id: string,
    data: {
      role: UserRole;
      production?: boolean;
    },
  ) {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.user.findUniqueOrThrow({ where: { id } });
      const productionChanged = data.production !== undefined && data.production !== current.production;
      // Gaining or losing ADMIN also ends open sessions, so nobody keeps a
      // token (or UI) from before the change.
      const adminChanged = data.role !== current.role && (data.role === 'ADMIN' || current.role === 'ADMIN');
      const changed = productionChanged || adminChanged;
      const updated = await tx.user.update({ where: { id }, data: { ...data, ...(changed ? { authVersion: { increment: 1 } } : {}) } });

      if (updated.production !== current.production) {
        await this.invalidateAccess(tx, id);
        if (!updated.production) await tx.userEmail.upsert({ where: { userId: id }, create: { userId: id }, update: {} });
      }

      return updated;
    });
  }

  setActive(id: string, active: boolean) {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.update({ where: { id }, data: { active, authVersion: { increment: 1 } } });
      await this.invalidateAccess(tx, id);
      return user;
    });
  }

  restore(
    id: string,
    data: {
      name: string;
      role: UserRole;
      passwordHash: string;
      production?: boolean;
    },
  ) {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id },
        data: {
          ...data,
          active: true,
          firstLogin: true,
          absent: false,
          authVersion: { increment: 1 },
        },
      });
      await this.invalidateAccess(tx, id);
      if (!user.production) await tx.userEmail.upsert({ where: { userId: id }, create: { userId: id }, update: {} });
      return user;
    });
  }

  setAbsent(id: string, absent: boolean) {
    return this.prisma.user.update({
      where: { id },
      data: { absent },
    });
  }

  markAbsencesSeen(id: string, at: Date) {
    return this.prisma.user.update({
      where: { id },
      data: { absencesSeenAt: at },
    });
  }

  resetPassword(id: string, passwordHash: string) {
    return this.writePassword(id, passwordHash, true);
  }

  countActiveAdmins(excludeUserId?: string) {
    return this.prisma.user.count({
      where: {
        role: 'ADMIN',
        active: true,
        ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
      },
    });
  }

  create(
    data: {
      employeeId: string;
      name: string;
      unit: UnitType;
      cardNumber: string;
      passwordHash: string;
      role: UserRole;
      production?: boolean;
    },
    initialShift?: {
      startMinutes: number;
      endMinutes: number;
      source: 'API' | 'MANUAL';
    } | null,
  ) {
    if (!initialShift) {
      return this.prisma.user.create({ data: { ...data, ...(!data.production ? { userEmail: { create: {} } } : {}) } });
    }

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({ data: { ...data, ...(!data.production ? { userEmail: { create: {} } } : {}) } });

      await tx.userShiftPeriod.create({
        data: {
          userId: user.id,
          startMinutes: initialShift.startMinutes,
          endMinutes: initialShift.endMinutes,
          startedAt: new Date(),
          source: initialShift.source,
        },
      });

      return user;
    });
  }
}
