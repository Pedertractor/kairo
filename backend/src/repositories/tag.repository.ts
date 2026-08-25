import type { PrismaClient } from '../generated/client.js';

export class TagRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findByTeamId(teamId: string) {
    return this.prisma.tag.findMany({
      where: { teamId },
      orderBy: { name: 'asc' },
    });
  }

  findById(id: string) {
    return this.prisma.tag.findUnique({
      where: { id },
    });
  }

  findByTeamAndName(teamId: string, name: string) {
    return this.prisma.tag.findUnique({
      where: {
        teamId_name: { teamId, name },
      },
    });
  }

  create(data: { teamId: string; name: string; color: string }) {
    return this.prisma.tag.create({ data });
  }

  update(id: string, data: { name?: string; color?: string }) {
    return this.prisma.tag.update({
      where: { id },
      data,
    });
  }

  delete(id: string) {
    return this.prisma.tag.delete({
      where: { id },
    });
  }
}
