import type {
  CardStatus,
  CardType,
  PrismaClient,
} from '../generated/client.js';

const activityTagInclude = {
  tag: {
    select: {
      id: true,
      name: true,
      color: true,
    },
  },
  client: {
    select: {
      id: true,
      name: true,
    },
  },
  machine: {
    select: {
      id: true,
      name: true,
      costCenter: true,
    },
  },
} as const;

export class CardRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findActivitiesByTeamId(teamId: string) {
    return this.prisma.card.findMany({
      where: { teamId, type: 'ACTIVITY' as CardType, deletedAt: null },
      include: activityTagInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  findActivityById(activityId: string) {
    return this.prisma.card.findFirst({
      where: { id: activityId, deletedAt: null },
      include: activityTagInclude,
    });
  }

  updateActivityStatus(activityId: string, status: CardStatus) {
    return this.prisma.card.update({
      where: { id: activityId },
      data: { status },
      include: activityTagInclude,
    });
  }

  updateActivity(
    activityId: string,
    data: {
      title?: string;
      status?: CardStatus;
      tagId?: string | null;
      description?: string | null;
      estimatedHours?: number | null;
      clientId?: string | null;
      machineId?: string | null;
    },
  ) {
    return this.prisma.card.update({
      where: { id: activityId },
      data: {
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.tagId !== undefined ? { tagId: data.tagId } : {}),
        ...(data.description !== undefined
          ? { description: data.description }
          : {}),
        ...(data.estimatedHours !== undefined
          ? { estimatedHours: data.estimatedHours }
          : {}),
        ...(data.clientId !== undefined ? { clientId: data.clientId } : {}),
        ...(data.machineId !== undefined ? { machineId: data.machineId } : {}),
      },
      include: activityTagInclude,
    });
  }

  createActivity(data: {
    teamId: string;
    createdById: string;
    title: string;
    description?: string;
    estimatedHours?: number;
    status?: CardStatus;
    tagId?: string;
    clientId?: string;
    machineId?: string;
  }) {
    return this.prisma.card.create({
      data: {
        teamId: data.teamId,
        createdById: data.createdById,
        title: data.title,
        description: data.description ?? null,
        type: 'ACTIVITY',
        status: data.status ?? 'TODO',
        estimatedHours: data.estimatedHours ?? null,
        tagId: data.tagId ?? null,
        clientId: data.clientId ?? null,
        machineId: data.machineId ?? null,
      },
      include: activityTagInclude,
    });
  }

  softDeleteActivity(activityId: string) {
    return this.prisma.card.update({
      where: { id: activityId },
      data: { deletedAt: new Date() },
      include: activityTagInclude,
    });
  }

  findProjectsByTeamId(teamId: string) {
    return this.prisma.card.findMany({
      where: { teamId, type: 'PROJECT' as CardType, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  findProjectsByUserId(userId: string) {
    return this.prisma.card.findMany({
      where: {
        type: 'PROJECT' as CardType,
        deletedAt: null,
        team: {
          members: { some: { userId } },
        },
      },
      include: {
        team: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  findProjectById(projectId: string) {
    return this.prisma.card.findFirst({
      where: { id: projectId, deletedAt: null },
      include: {
        team: { select: { id: true, name: true } },
      },
    });
  }

  updateProjectStatus(projectId: string, status: CardStatus) {
    return this.updateProject(projectId, { status });
  }

  updateProject(
    projectId: string,
    data: {
      title?: string;
      status?: CardStatus;
      description?: string | null;
    },
  ) {
    return this.prisma.card.update({
      where: { id: projectId },
      data: {
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.description !== undefined
          ? { description: data.description }
          : {}),
      },
    });
  }

  createProject(data: {
    teamId: string;
    createdById: string;
    title: string;
    description?: string;
    estimatedHours?: number;
    status?: CardStatus;
  }) {
    return this.prisma.card.create({
      data: {
        teamId: data.teamId,
        createdById: data.createdById,
        title: data.title,
        description: data.description ?? null,
        type: 'PROJECT',
        status: data.status ?? 'TODO',
        estimatedHours: data.estimatedHours ?? null,
      },
    });
  }

  softDeleteProject(projectId: string) {
    const deletedAt = new Date();

    return this.prisma.$transaction([
      this.prisma.task.updateMany({
        where: { cardId: projectId, deletedAt: null },
        data: { deletedAt },
      }),
      this.prisma.card.update({
        where: { id: projectId },
        data: { deletedAt },
      }),
    ]);
  }
}
