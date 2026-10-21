import type { TeamRole } from '../generated/client.js';
import { CardRepository } from '../repositories/card.repository.js';
import { FavoriteRepository } from '../repositories/favorite.repository.js';
import { TaskRepository } from '../repositories/task.repository.js';
import { TeamRepository } from '../repositories/team.repository.js';
import type {
  FavoriteWorkItem,
  ToggleFavoriteResult,
} from '../types/favorite.types.js';
import { AppError } from '../utils/errors.js';
import { MENSAGENS } from '../utils/response.js';
import {
  assertTeamMembership,
  canChangeActivityStatus,
} from '../utils/team-access.js';

export class FavoriteService {
  constructor(
    private readonly favoriteRepository: FavoriteRepository,
    private readonly cardRepository: CardRepository,
    private readonly taskRepository: TaskRepository,
    private readonly teamRepository: TeamRepository,
  ) {}

  private async assertTeamMember(teamId: string, userId: string) {
    const membership = await this.teamRepository.findMembershipByTeamAndUser(
      teamId,
      userId,
    );
    assertTeamMembership(membership);
  }

  async listFavorites(userId: string): Promise<FavoriteWorkItem[]> {
    const [favorites, memberships] = await Promise.all([
      this.favoriteRepository.findByUserId(userId),
      this.teamRepository.findMembershipsByUserId(userId, { active: true }),
    ]);
    const roleByTeamId = new Map<string, TeamRole>(
      memberships.map((membership) => [membership.teamId, membership.role]),
    );
    const items: FavoriteWorkItem[] = [];

    for (const favorite of favorites) {
      if (favorite.card) {
        if (favorite.card.type !== 'ACTIVITY') {
          continue;
        }

        const statusOpen = !['DONE', 'CANCELED'].includes(favorite.card.status);
        const role = roleByTeamId.get(favorite.card.teamId);
        const canStartTimer =
          statusOpen &&
          role !== undefined &&
          canChangeActivityStatus(
            role,
            favorite.card.team.membersCanEditActivities,
            favorite.card.assignedToId,
            userId,
          );

        items.push({
          kind: 'ACTIVITY',
          id: favorite.card.id,
          title: favorite.card.title,
          teamId: favorite.card.teamId,
          teamName: favorite.card.team.name,
          status: favorite.card.status,
          parentTitle: null,
          canStartTimer,
          activityId: favorite.card.id,
          projectId: null,
          taskId: null,
          favoritedAt: favorite.createdAt.toISOString(),
        });
        continue;
      }

      if (favorite.task) {
        if (favorite.task.card.type !== 'PROJECT') {
          continue;
        }

        items.push({
          kind: 'TASK',
          id: favorite.task.id,
          title: favorite.task.title,
          teamId: favorite.task.card.teamId,
          teamName: favorite.task.card.team.name,
          status: favorite.task.status,
          parentTitle: favorite.task.card.title,
          canStartTimer: !['DONE', 'CANCELED'].includes(favorite.task.status),
          activityId: null,
          projectId: favorite.task.card.id,
          taskId: favorite.task.id,
          favoritedAt: favorite.createdAt.toISOString(),
        });
      }
    }

    return items;
  }

  async toggleActivityFavorite(
    teamId: string,
    activityId: string,
    userId: string,
  ): Promise<ToggleFavoriteResult> {
    await this.assertTeamMember(teamId, userId);

    const card = await this.cardRepository.findActivityById(activityId);

    if (!card || card.teamId !== teamId || card.type !== 'ACTIVITY') {
      throw new AppError(404, MENSAGENS.NAO_ENCONTRADO);
    }

    const existing = await this.favoriteRepository.findActivityFavorite(
      userId,
      activityId,
    );

    if (existing) {
      await this.favoriteRepository.deleteActivityFavorite(userId, activityId);
      return { isFavorite: false };
    }

    await this.favoriteRepository.createActivityFavorite(userId, activityId);
    return { isFavorite: true };
  }

  async toggleTaskFavorite(
    projectId: string,
    taskId: string,
    userId: string,
  ): Promise<ToggleFavoriteResult> {
    const card = await this.cardRepository.findProjectById(projectId);

    if (!card || card.type !== 'PROJECT') {
      throw new AppError(404, MENSAGENS.NAO_ENCONTRADO);
    }

    await this.assertTeamMember(card.teamId, userId);

    const task = await this.taskRepository.findById(taskId);

    if (!task || task.cardId !== projectId) {
      throw new AppError(404, MENSAGENS.NAO_ENCONTRADO);
    }

    const existing = await this.favoriteRepository.findTaskFavorite(
      userId,
      taskId,
    );

    if (existing) {
      await this.favoriteRepository.deleteTaskFavorite(userId, taskId);
      return { isFavorite: false };
    }

    await this.favoriteRepository.createTaskFavorite(userId, taskId);
    return { isFavorite: true };
  }
}
