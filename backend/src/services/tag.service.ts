import type { Tag } from '../generated/client.js';
import { TagRepository } from '../repositories/tag.repository.js';
import { TeamRepository } from '../repositories/team.repository.js';
import type { TagSummary } from '../types/tag.types.js';
import { AppError } from '../utils/errors.js';
import { MENSAGENS } from '../utils/response.js';

function toTagSummary(tag: Tag): TagSummary {
  return {
    id: tag.id,
    teamId: tag.teamId,
    name: tag.name,
    color: tag.color,
    createdAt: tag.createdAt.toISOString(),
    updatedAt: tag.updatedAt.toISOString(),
  };
}

export class TagService {
  constructor(
    private readonly tagRepository: TagRepository,
    private readonly teamRepository: TeamRepository,
  ) {}

  private async assertTeamMember(teamId: string, userId: string) {
    const membership = await this.teamRepository.findMembershipByTeamAndUser(
      teamId,
      userId,
    );

    if (!membership) {
      throw new AppError(404, MENSAGENS.NAO_ENCONTRADO);
    }
  }

  async list(teamId: string, userId: string): Promise<TagSummary[]> {
    await this.assertTeamMember(teamId, userId);

    const tags = await this.tagRepository.findByTeamId(teamId);
    return tags.map(toTagSummary);
  }

  async create(
    teamId: string,
    userId: string,
    name: string,
    color: string,
  ): Promise<TagSummary> {
    await this.assertTeamMember(teamId, userId);

    const existing = await this.tagRepository.findByTeamAndName(teamId, name);

    if (existing) {
      throw new AppError(409, MENSAGENS.TAG_JA_EXISTE);
    }

    const tag = await this.tagRepository.create({ teamId, name, color });
    return toTagSummary(tag);
  }
}
