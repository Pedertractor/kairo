import type { CardHistoryEventType, PrismaClient } from '../generated/client.js';

const historyInclude = {
  changedBy: {
    select: {
      id: true,
      name: true,
    },
  },
} as const;

export class CardHistoryRepository {
  constructor(private readonly prisma: PrismaClient) {}

  createAssigneeChange(data: {
    cardId: string;
    changedById: string;
    fromAssignedToId: string | null;
    fromAssignedToName: string | null;
    toAssignedToId: string | null;
    toAssignedToName: string | null;
  }) {
    return this.prisma.cardHistoryEvent.create({
      data: {
        cardId: data.cardId,
        type: 'ASSIGNEE_CHANGED' satisfies CardHistoryEventType,
        changedById: data.changedById,
        fromAssignedToId: data.fromAssignedToId,
        fromAssignedToName: data.fromAssignedToName,
        toAssignedToId: data.toAssignedToId,
        toAssignedToName: data.toAssignedToName,
      },
      include: historyInclude,
    });
  }

  findByCardId(cardId: string) {
    return this.prisma.cardHistoryEvent.findMany({
      where: { cardId },
      include: historyInclude,
      orderBy: { createdAt: 'desc' },
    });
  }
}
