import { TeamRole, UserRole, type PrismaClient } from '../generated/client.js';
import { HierarchyRepository } from './hierarchy.repository.js';

const memberInclude = {
  members: {
    include: {
      user: { select: { id: true, name: true, absent: true } },
    },
    orderBy: { joinedAt: 'asc' as const },
  },
  costCenters: {
    include: {
      costCenter: {
        select: { id: true, costCenter: true, description: true },
      },
    },
    orderBy: { costCenter: { costCenter: 'asc' as const } },
  },
  _count: { select: { members: true } },
};

type TeamMembershipWithTeam = NonNullable<
  Awaited<ReturnType<TeamRepository['findMembershipByTeamAndUser']>>
>;

export type TeamReadAccess = TeamMembershipWithTeam & { readOnly: boolean };

export class TeamRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findMembershipsByUserId(
    userId: string,
    options: { active: boolean; adminOnly?: boolean },
  ) {
    return this.prisma.teamMember.findMany({
      where: {
        userId,
        ...(options.adminOnly ? { role: 'ADMIN' } : {}),
        team: { active: options.active },
      },
      include: {
        team: {
          include: memberInclude,
        },
      },
      orderBy: { team: { name: 'asc' } },
    });
  }

  findMembershipByTeamAndUser(teamId: string, userId: string) {
    return this.prisma.teamMember.findUnique({
      where: {
        teamId_userId: { teamId, userId },
      },
      include: {
        team: {
          include: memberInclude,
        },
      },
    });
  }

  /**
   * Access for read-only endpoints: the caller's real membership when there is
   * one; otherwise a synthetic, read-only ADMIN-level view for system admins and
   * for supervisors of one of the team's admins (leaders). Write paths must keep
   * using `findMembershipByTeamAndUser`, so this view can never edit anything.
   */
  async findReadAccessByTeamAndUser(
    teamId: string,
    userId: string,
  ): Promise<TeamReadAccess | null> {
    const membership = await this.findMembershipByTeamAndUser(teamId, userId);

    if (membership) {
      return { ...membership, readOnly: false };
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, active: true, cardNumber: true, unit: true },
    });

    if (
      !user?.active ||
      (user.role !== UserRole.ADMIN && user.role !== UserRole.SUPERVISOR)
    ) {
      return null;
    }

    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
      include: memberInclude,
    });

    if (!team) {
      return null;
    }

    if (user.role === UserRole.SUPERVISOR) {
      const hierarchy = new HierarchyRepository(this.prisma);
      const leaderIds = new Set(
        await hierarchy.findLeaderUserIdsOfSupervisor({
          unit: user.unit,
          card: user.cardNumber,
        }),
      );
      const supervisesTeam = team.members.some(
        (member) => member.role === TeamRole.ADMIN && leaderIds.has(member.userId),
      );

      if (!supervisesTeam) {
        return null;
      }
    }

    return {
      id: `readonly:${teamId}:${userId}`,
      teamId,
      userId,
      role: TeamRole.ADMIN,
      joinedAt: team.createdAt,
      team,
      readOnly: true,
    };
  }

  findById(teamId: string) {
    return this.prisma.team.findUnique({
      where: { id: teamId },
    });
  }

  addMember(teamId: string, userId: string, role: TeamRole) {
    return this.prisma.teamMember.create({
      data: {
        teamId,
        userId,
        role,
      },
    });
  }

  countAdminsByTeamId(teamId: string) {
    return this.prisma.teamMember.count({
      where: { teamId, role: 'ADMIN' },
    });
  }

  deleteMember(teamId: string, userId: string) {
    return this.prisma.teamMember.delete({
      where: {
        teamId_userId: { teamId, userId },
      },
    });
  }

  promoteToAdmin(teamId: string, userId: string) {
    return this.prisma.teamMember.update({
      where: {
        teamId_userId: { teamId, userId },
      },
      data: { role: 'ADMIN' },
    });
  }

  demoteAdmin(teamId: string, userId: string) {
    return this.prisma.teamMember.update({
      where: {
        teamId_userId: { teamId, userId },
      },
      data: { role: 'MEMBER' },
    });
  }

  setActive(teamId: string, active: boolean) {
    return this.prisma.team.update({
      where: { id: teamId },
      data: { active },
    });
  }

  updateTeam(
    teamId: string,
    data: {
      name?: string;
      description?: string | null;
      membersCanCreateActivities?: boolean;
      membersCanCreateProjects?: boolean;
      membersCanViewTimeline?: boolean;
      membersCanEditActivities?: boolean;
      membersCanEditTags?: boolean;
      membersCanDeleteTags?: boolean;
      membersCanDeleteCards?: boolean;
    },
  ) {
    return this.prisma.team.update({
      where: { id: teamId },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.description !== undefined
          ? { description: data.description }
          : {}),
        ...(data.membersCanCreateActivities !== undefined
          ? { membersCanCreateActivities: data.membersCanCreateActivities }
          : {}),
        ...(data.membersCanCreateProjects !== undefined
          ? { membersCanCreateProjects: data.membersCanCreateProjects }
          : {}),
        ...(data.membersCanViewTimeline !== undefined
          ? { membersCanViewTimeline: data.membersCanViewTimeline }
          : {}),
        ...(data.membersCanEditActivities !== undefined
          ? { membersCanEditActivities: data.membersCanEditActivities }
          : {}),
        ...(data.membersCanEditTags !== undefined
          ? { membersCanEditTags: data.membersCanEditTags }
          : {}),
        ...(data.membersCanDeleteTags !== undefined
          ? { membersCanDeleteTags: data.membersCanDeleteTags }
          : {}),
        ...(data.membersCanDeleteCards !== undefined
          ? { membersCanDeleteCards: data.membersCanDeleteCards }
          : {}),
      },
      include: memberInclude,
    });
  }

  createTeamWithCreatorMember(
    name: string,
    description: string | undefined,
    createdById: string,
    creatorRole: TeamRole,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const team = await tx.team.create({
        data: {
          name,
          description: description || null,
          createdById,
        },
      });

      await tx.teamMember.create({
        data: {
          teamId: team.id,
          userId: createdById,
          role: creatorRole,
        },
      });

      return tx.team.findUniqueOrThrow({
        where: { id: team.id },
        include: memberInclude,
      });
    });
  }
}
