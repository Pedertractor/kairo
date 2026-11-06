import type { PrismaClient } from '../generated/client.js';

export class InfractionLeaderRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async list() {
    const leaders = await this.prisma.user.findMany({
      where: { role: 'LEADER', active: true },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      select: {
        id: true, name: true,
        memberships: {
          where: { role: 'ADMIN', team: { active: true } },
          select: { team: { select: { members: {
            where: { user: { active: true } },
            select: { user: { select: { unit: true, cardNumber: true } } },
          } } } },
        },
      },
    });
    return leaders.map(({ id, name, memberships }) => ({
      id, name,
      members: [...new Map(memberships.flatMap(({ team }) => team.members.map(({ user }) =>
        [JSON.stringify([user.unit, user.cardNumber]), user] as const,
      ))).values()],
    }));
  }
}
