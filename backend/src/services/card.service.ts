import type { Card, CardStatus } from '../generated/client.js';
import { CardRepository } from '../repositories/card.repository.js';
import { ClientRepository } from '../repositories/client.repository.js';
import { FavoriteRepository } from '../repositories/favorite.repository.js';
import { TagRepository } from '../repositories/tag.repository.js';
import { TimeEntryRepository } from '../repositories/time-entry.repository.js';
import { TeamRepository } from '../repositories/team.repository.js';
import type {
  ActivityClientSummary,
  ActivitySummary,
  ActivityTagSummary,
  ProjectSummary,
} from '../types/card.types.js';
import { AppError } from '../utils/errors.js';
import { MENSAGENS } from '../utils/response.js';

type CardWithRelations = Card & {
  tag?: ActivityTagSummary | null;
  client?: ActivityClientSummary | null;
};

function toActivityTag(
  tag: ActivityTagSummary | null | undefined,
): ActivityTagSummary | null {
  if (!tag) {
    return null;
  }

  return {
    id: tag.id,
    name: tag.name,
    color: tag.color,
  };
}

function toActivityClient(
  client: ActivityClientSummary | null | undefined,
): ActivityClientSummary | null {
  if (!client) {
    return null;
  }

  return {
    id: client.id,
    name: client.name,
  };
}

function toActivitySummary(
  card: CardWithRelations,
  loggedSeconds = 0,
  isFavorite = false,
): ActivitySummary {
  return {
    id: card.id,
    teamId: card.teamId,
    title: card.title,
    description: card.description,
    status: card.status,
    estimatedHours: card.estimatedHours?.toString() ?? null,
    loggedSeconds,
    isFavorite,
    tag: toActivityTag(card.tag),
    client: toActivityClient(card.client),
    createdById: card.createdById,
    createdAt: card.createdAt.toISOString(),
    updatedAt: card.updatedAt.toISOString(),
  };
}

function toProjectSummary(
  card: Card,
  loggedSeconds = 0,
  teamName?: string,
): ProjectSummary {
  return {
    id: card.id,
    teamId: card.teamId,
    ...(teamName ? { teamName } : {}),
    title: card.title,
    description: card.description,
    status: card.status,
    estimatedHours: card.estimatedHours?.toString() ?? null,
    loggedSeconds,
    createdById: card.createdById,
    createdAt: card.createdAt.toISOString(),
    updatedAt: card.updatedAt.toISOString(),
  };
}

export class CardService {
  constructor(
    private readonly cardRepository: CardRepository,
    private readonly teamRepository: TeamRepository,
    private readonly timeEntryRepository: TimeEntryRepository,
    private readonly favoriteRepository: FavoriteRepository,
    private readonly tagRepository: TagRepository,
    private readonly clientRepository: ClientRepository,
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

  private async assertTeamTag(teamId: string, tagId: string) {
    const tag = await this.tagRepository.findById(tagId);

    if (!tag || tag.teamId !== teamId) {
      throw new AppError(404, MENSAGENS.TAG_NAO_ENCONTRADA);
    }
  }

  private async assertClient(clientId: string) {
    const client = await this.clientRepository.findById(clientId);

    if (!client) {
      throw new AppError(404, MENSAGENS.CLIENTE_NAO_ENCONTRADO);
    }
  }

  private async getFavoriteCardIdSet(userId: string, cardIds: string[]) {
    const favorites = await this.favoriteRepository.findFavoriteCardIds(
      userId,
      cardIds,
    );

    return new Set(
      favorites
        .map((favorite) => favorite.cardId)
        .filter((cardId): cardId is string => cardId !== null),
    );
  }

  async listActivities(
    teamId: string,
    userId: string,
  ): Promise<ActivitySummary[]> {
    await this.assertTeamMember(teamId, userId);

    const cards = await this.cardRepository.findActivitiesByTeamId(teamId);
    const cardIds = cards.map((card) => card.id);
    const [loggedByCard, favoriteIds] = await Promise.all([
      this.timeEntryRepository.getLoggedSecondsByCardIds(cardIds),
      this.getFavoriteCardIdSet(userId, cardIds),
    ]);

    return cards.map((card) =>
      toActivitySummary(
        card,
        loggedByCard.get(card.id) ?? 0,
        favoriteIds.has(card.id),
      ),
    );
  }

  async getActivity(
    teamId: string,
    activityId: string,
    userId: string,
  ): Promise<ActivitySummary> {
    await this.assertTeamMember(teamId, userId);

    const card = await this.cardRepository.findActivityById(activityId);

    if (!card || card.teamId !== teamId || card.type !== 'ACTIVITY') {
      throw new AppError(404, MENSAGENS.NAO_ENCONTRADO);
    }

    const [loggedByCard, favorite] = await Promise.all([
      this.timeEntryRepository.getLoggedSecondsByCardIds([activityId]),
      this.favoriteRepository.findActivityFavorite(userId, activityId),
    ]);

    return toActivitySummary(
      card,
      loggedByCard.get(activityId) ?? 0,
      favorite !== null,
    );
  }

  async createActivity(
    teamId: string,
    userId: string,
    title: string,
    description?: string,
    estimatedHours?: number,
    tagId?: string,
    clientId?: string,
  ): Promise<ActivitySummary> {
    await this.assertTeamMember(teamId, userId);

    if (tagId) {
      await this.assertTeamTag(teamId, tagId);
    }

    if (clientId) {
      await this.assertClient(clientId);
    }

    const card = await this.cardRepository.createActivity({
      teamId,
      createdById: userId,
      title,
      description,
      estimatedHours,
      tagId,
      clientId,
    });

    return toActivitySummary(card);
  }

  async updateActivityStatus(
    teamId: string,
    activityId: string,
    userId: string,
    status: CardStatus,
  ): Promise<ActivitySummary> {
    return this.updateActivity(teamId, activityId, userId, { status });
  }

  async updateActivity(
    teamId: string,
    activityId: string,
    userId: string,
    data: { title?: string; status?: CardStatus; tagId?: string | null },
  ): Promise<ActivitySummary> {
    await this.assertTeamMember(teamId, userId);

    const card = await this.cardRepository.findActivityById(activityId);

    if (!card || card.teamId !== teamId || card.type !== 'ACTIVITY') {
      throw new AppError(404, MENSAGENS.NAO_ENCONTRADO);
    }

    if (data.tagId) {
      await this.assertTeamTag(teamId, data.tagId);
    }

    const updated = await this.cardRepository.updateActivity(activityId, data);

    const [loggedByCard, favorite] = await Promise.all([
      this.timeEntryRepository.getLoggedSecondsByCardIds([activityId]),
      this.favoriteRepository.findActivityFavorite(userId, activityId),
    ]);

    return toActivitySummary(
      updated,
      loggedByCard.get(activityId) ?? 0,
      favorite !== null,
    );
  }

  async listProjects(
    teamId: string,
    userId: string,
  ): Promise<ProjectSummary[]> {
    await this.assertTeamMember(teamId, userId);

    const cards = await this.cardRepository.findProjectsByTeamId(teamId);
    const loggedByProject =
      await this.timeEntryRepository.getLoggedSecondsByProjectIds(
        cards.map((card) => card.id),
      );

    return cards.map((card) =>
      toProjectSummary(card, loggedByProject.get(card.id) ?? 0),
    );
  }

  async listAllProjects(userId: string): Promise<ProjectSummary[]> {
    const cards = await this.cardRepository.findProjectsByUserId(userId);
    const loggedByProject =
      await this.timeEntryRepository.getLoggedSecondsByProjectIds(
        cards.map((card) => card.id),
      );

    return cards.map((card) =>
      toProjectSummary(
        card,
        loggedByProject.get(card.id) ?? 0,
        card.team.name,
      ),
    );
  }

  async getProject(
    teamId: string,
    projectId: string,
    userId: string,
  ): Promise<ProjectSummary> {
    await this.assertTeamMember(teamId, userId);

    const card = await this.cardRepository.findProjectById(projectId);

    if (!card || card.teamId !== teamId || card.type !== 'PROJECT') {
      throw new AppError(404, MENSAGENS.NAO_ENCONTRADO);
    }

    const loggedByProject =
      await this.timeEntryRepository.getLoggedSecondsByProjectIds([projectId]);

    return toProjectSummary(
      card,
      loggedByProject.get(projectId) ?? 0,
      card.team.name,
    );
  }

  async getProjectById(
    projectId: string,
    userId: string,
  ): Promise<ProjectSummary> {
    const card = await this.cardRepository.findProjectById(projectId);

    if (!card || card.type !== 'PROJECT') {
      throw new AppError(404, MENSAGENS.NAO_ENCONTRADO);
    }

    await this.assertTeamMember(card.teamId, userId);

    const loggedByProject =
      await this.timeEntryRepository.getLoggedSecondsByProjectIds([projectId]);

    return toProjectSummary(
      card,
      loggedByProject.get(projectId) ?? 0,
      card.team.name,
    );
  }

  async createProject(
    teamId: string,
    userId: string,
    title: string,
    description?: string,
    estimatedHours?: number,
  ): Promise<ProjectSummary> {
    await this.assertTeamMember(teamId, userId);

    const card = await this.cardRepository.createProject({
      teamId,
      createdById: userId,
      title,
      description,
      estimatedHours,
    });

    return toProjectSummary(card);
  }

  async updateProjectStatus(
    teamId: string,
    projectId: string,
    userId: string,
    status: CardStatus,
  ): Promise<ProjectSummary> {
    return this.updateProject(teamId, projectId, userId, { status });
  }

  async updateProject(
    teamId: string,
    projectId: string,
    userId: string,
    data: { title?: string; status?: CardStatus },
  ): Promise<ProjectSummary> {
    await this.assertTeamMember(teamId, userId);

    const card = await this.cardRepository.findProjectById(projectId);

    if (!card || card.teamId !== teamId || card.type !== 'PROJECT') {
      throw new AppError(404, MENSAGENS.NAO_ENCONTRADO);
    }

    const updated = await this.cardRepository.updateProject(projectId, data);

    const loggedByProject =
      await this.timeEntryRepository.getLoggedSecondsByProjectIds([projectId]);

    return toProjectSummary(
      updated,
      loggedByProject.get(projectId) ?? 0,
      card.team.name,
    );
  }

  async deleteActivity(
    teamId: string,
    activityId: string,
    userId: string,
  ): Promise<ActivitySummary> {
    await this.assertTeamMember(teamId, userId);

    const card = await this.cardRepository.findActivityById(activityId);

    if (!card || card.teamId !== teamId || card.type !== 'ACTIVITY') {
      throw new AppError(404, MENSAGENS.NAO_ENCONTRADO);
    }

    const activeEntries =
      await this.timeEntryRepository.findActiveManyByCardId(activityId);
    const endedAt = new Date();

    for (const entry of activeEntries) {
      await this.timeEntryRepository.stopEntry(entry, endedAt);
    }

    const deleted = await this.cardRepository.softDeleteActivity(activityId);

    return toActivitySummary(deleted);
  }

  async deleteProject(
    teamId: string,
    projectId: string,
    userId: string,
  ): Promise<ProjectSummary> {
    await this.assertTeamMember(teamId, userId);

    const card = await this.cardRepository.findProjectById(projectId);

    if (!card || card.teamId !== teamId || card.type !== 'PROJECT') {
      throw new AppError(404, MENSAGENS.NAO_ENCONTRADO);
    }

    const activeEntries =
      await this.timeEntryRepository.findActiveManyByProjectId(projectId);
    const endedAt = new Date();

    for (const entry of activeEntries) {
      await this.timeEntryRepository.stopEntry(entry, endedAt);
    }

    await this.cardRepository.softDeleteProject(projectId);

    return toProjectSummary(card, 0, card.team.name);
  }
}
