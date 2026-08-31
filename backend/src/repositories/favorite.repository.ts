import type { PrismaClient } from '../generated/client.js';

export class FavoriteRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findByUserId(userId: string) {
    return this.prisma.userFavorite.findMany({
      where: {
        userId,
        OR: [
          { card: { deletedAt: null, team: { active: true } } },
          {
            task: {
              deletedAt: null,
              card: { deletedAt: null, team: { active: true } },
            },
          },
        ],
      },
      include: {
        card: {
          select: {
            id: true,
            title: true,
            type: true,
            status: true,
            teamId: true,
            team: { select: { id: true, name: true } },
          },
        },
        task: {
          select: {
            id: true,
            title: true,
            status: true,
            cardId: true,
            card: {
              select: {
                id: true,
                title: true,
                type: true,
                teamId: true,
                team: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  findActivityFavorite(userId: string, cardId: string) {
    return this.prisma.userFavorite.findUnique({
      where: {
        userId_cardId: { userId, cardId },
      },
    });
  }

  findTaskFavorite(userId: string, taskId: string) {
    return this.prisma.userFavorite.findUnique({
      where: {
        userId_taskId: { userId, taskId },
      },
    });
  }

  findFavoriteCardIds(userId: string, cardIds: string[]) {
    if (cardIds.length === 0) {
      return Promise.resolve([] as { cardId: string | null }[]);
    }

    return this.prisma.userFavorite.findMany({
      where: {
        userId,
        cardId: { in: cardIds },
      },
      select: { cardId: true },
    });
  }

  findFavoriteTaskIds(userId: string, taskIds: string[]) {
    if (taskIds.length === 0) {
      return Promise.resolve([] as { taskId: string | null }[]);
    }

    return this.prisma.userFavorite.findMany({
      where: {
        userId,
        taskId: { in: taskIds },
      },
      select: { taskId: true },
    });
  }

  createActivityFavorite(userId: string, cardId: string) {
    return this.prisma.userFavorite.create({
      data: { userId, cardId },
    });
  }

  createTaskFavorite(userId: string, taskId: string) {
    return this.prisma.userFavorite.create({
      data: { userId, taskId },
    });
  }

  deleteActivityFavorite(userId: string, cardId: string) {
    return this.prisma.userFavorite.delete({
      where: {
        userId_cardId: { userId, cardId },
      },
    });
  }

  deleteTaskFavorite(userId: string, taskId: string) {
    return this.prisma.userFavorite.delete({
      where: {
        userId_taskId: { userId, taskId },
      },
    });
  }
}
