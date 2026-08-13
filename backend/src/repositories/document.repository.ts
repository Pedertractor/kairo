import type { PrismaClient } from '../generated/client.js';

const uploadedBySelect = {
  uploadedBy: {
    select: {
      id: true,
      name: true,
    },
  },
} as const;

export class DocumentRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findByTeamId(teamId: string) {
    return this.prisma.teamDocument.findMany({
      where: { teamId },
      include: uploadedBySelect,
      orderBy: { createdAt: 'desc' },
    });
  }

  findByIdAndTeamId(id: string, teamId: string) {
    return this.prisma.teamDocument.findFirst({
      where: { id, teamId },
      include: uploadedBySelect,
    });
  }

  create(data: {
    teamId: string;
    uploadedById: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    storageKey: string;
  }) {
    return this.prisma.teamDocument.create({
      data,
      include: uploadedBySelect,
    });
  }

  updateStorageKey(id: string, storageKey: string) {
    return this.prisma.teamDocument.update({
      where: { id },
      data: { storageKey },
      include: uploadedBySelect,
    });
  }

  deleteById(id: string) {
    return this.prisma.teamDocument.delete({
      where: { id },
    });
  }
}
