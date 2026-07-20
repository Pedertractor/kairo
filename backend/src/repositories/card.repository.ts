import type {
  CardStatus,
  CardType,
  PrismaClient,
} from '../generated/client.js';

export class CardRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findActivitiesByTeamId(teamId: string) {
    return this.prisma.card.findMany({
      where: { teamId, type: 'ACTIVITY' as CardType },
      orderBy: { createdAt: 'desc' },
    });
  }

  findActivityById(activityId: string) {
    return this.prisma.card.findUnique({
      where: { id: activityId },
    });
  }

  updateActivityStatus(activityId: string, status: CardStatus) {
    return this.prisma.card.update({
      where: { id: activityId },
      data: { status },
    });
  }

  updateActivity(
    activityId: string,
    data: { title?: string; status?: CardStatus },
  ) {
    return this.prisma.card.update({
      where: { id: activityId },
      data: {
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
      },
    });
  }

  createActivity(data: {
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
        type: 'ACTIVITY',
        status: data.status ?? 'TODO',
        estimatedHours: data.estimatedHours ?? null,
      },
    });
  }

  findProjectsByTeamId(teamId: string) {
    return this.prisma.card.findMany({
      where: { teamId, type: 'PROJECT' as CardType },
      orderBy: { createdAt: 'desc' },
    });
  }

  findProjectsByUserId(userId: string) {
    return this.prisma.card.findMany({
      where: {
        type: 'PROJECT' as CardType,
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
    return this.prisma.card.findUnique({
      where: { id: projectId },
      include: {
        team: { select: { id: true, name: true } },
      },
    });
  }

  updateProjectStatus(projectId: string, status: CardStatus) {
    return this.prisma.card.update({
      where: { id: projectId },
      data: { status },
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
}
