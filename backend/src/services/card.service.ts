import type { Card, CardStatus } from '../generated/client.js';
import { CardRepository } from '../repositories/card.repository.js';
import { TeamRepository } from '../repositories/team.repository.js';
import type { ActivitySummary, ProjectSummary } from '../types/card.types.js';
import { AppError } from '../utils/errors.js';
import { MENSAGENS } from '../utils/response.js';

function toActivitySummary(card: Card): ActivitySummary {
  return {
    id: card.id,
    teamId: card.teamId,
    title: card.title,
    description: card.description,
    status: card.status,
    estimatedHours: card.estimatedHours?.toString() ?? null,
    createdById: card.createdById,
    createdAt: card.createdAt.toISOString(),
    updatedAt: card.updatedAt.toISOString(),
  };
}

function toProjectSummary(
  card: Card,
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
    createdById: card.createdById,
    createdAt: card.createdAt.toISOString(),
    updatedAt: card.updatedAt.toISOString(),
  };
}

export class CardService {
  constructor(
    private readonly cardRepository: CardRepository,
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

  async listActivities(
    teamId: string,
    userId: string,
  ): Promise<ActivitySummary[]> {
    await this.assertTeamMember(teamId, userId);

    const cards = await this.cardRepository.findActivitiesByTeamId(teamId);

    return cards.map(toActivitySummary);
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

    return toActivitySummary(card);
  }

  async createActivity(
    teamId: string,
    userId: string,
    title: string,
    description?: string,
    estimatedHours?: number,
  ): Promise<ActivitySummary> {
    await this.assertTeamMember(teamId, userId);

    const card = await this.cardRepository.createActivity({
      teamId,
      createdById: userId,
      title,
      description,
      estimatedHours,
    });

    return toActivitySummary(card);
  }

  async updateActivityStatus(
    teamId: string,
    activityId: string,
    userId: string,
    status: CardStatus,
  ): Promise<ActivitySummary> {
    await this.assertTeamMember(teamId, userId);

    const card = await this.cardRepository.findActivityById(activityId);

    if (!card || card.teamId !== teamId || card.type !== 'ACTIVITY') {
      throw new AppError(404, MENSAGENS.NAO_ENCONTRADO);
    }

    const updated = await this.cardRepository.updateActivityStatus(
      activityId,
      status,
    );

    return toActivitySummary(updated);
  }

  async listProjects(
    teamId: string,
    userId: string,
  ): Promise<ProjectSummary[]> {
    await this.assertTeamMember(teamId, userId);

    const cards = await this.cardRepository.findProjectsByTeamId(teamId);

    return cards.map((card) => toProjectSummary(card));
  }

  async listAllProjects(userId: string): Promise<ProjectSummary[]> {
    const cards = await this.cardRepository.findProjectsByUserId(userId);

    return cards.map((card) =>
      toProjectSummary(card, card.team.name),
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

    return toProjectSummary(card, card.team.name);
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

    return toProjectSummary(card, card.team.name);
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
    await this.assertTeamMember(teamId, userId);

    const card = await this.cardRepository.findProjectById(projectId);

    if (!card || card.teamId !== teamId || card.type !== 'PROJECT') {
      throw new AppError(404, MENSAGENS.NAO_ENCONTRADO);
    }

    const updated = await this.cardRepository.updateProjectStatus(
      projectId,
      status,
    );

    return toProjectSummary(updated);
  }
}
