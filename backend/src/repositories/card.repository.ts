import type { CardStatus, CardType, PrismaClient } from '../generated/client.js';

export class CardRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findActivitiesByTeamId(teamId: string) {
    return this.prisma.card.findMany({
      where: { teamId, type: 'ACTIVITY' as CardType },
      orderBy: { createdAt: 'desc' },
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
}
