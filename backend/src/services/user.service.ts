import bcrypt from 'bcryptjs';
import { ShiftSource, TeamRole, UserRole } from '../generated/client.js';
import { env } from '../config/env.js';
import { EmployeeService } from './employee.service.js';
import { ShiftService } from './shift.service.js';
import { CardRepository } from '../repositories/card.repository.js';
import { RefreshTokenRepository } from '../repositories/refresh-token.repository.js';
import { TaskRepository } from '../repositories/task.repository.js';
import { TeamRepository } from '../repositories/team.repository.js';
import { TimeEntryRepository } from '../repositories/time-entry.repository.js';
import { UserRepository } from '../repositories/user.repository.js';
import type { SafeUser } from '../types/auth.types.js';
import type { EmployeeLookupResult } from '../types/employee.types.js';
import { AppError } from '../utils/errors.js';
import { MENSAGENS } from '../utils/response.js';
import { toEmployeeId, toSafeUser } from '../utils/user.js';
import { stopUnfinishedTimeEntriesForUser } from './stop-user-time-entries.js';

type UserRecord = {
  id: string;
  employeeId: string;
  name: string;
  unit: EmployeeLookupResult['unit'];
  cardNumber: string;
  passwordHash: string;
  role: UserRole;
  active: boolean;
  firstLogin: boolean;
  absent: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export class UserService {
  private readonly employeeService = new EmployeeService();

  constructor(
    private readonly userRepository: UserRepository,
    private readonly teamRepository: TeamRepository,
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly timeEntryRepository: TimeEntryRepository,
    private readonly taskRepository: TaskRepository,
    private readonly cardRepository: CardRepository,
    private readonly shiftService: ShiftService,
  ) {}

  private async getActorOrThrow(actorUserId: string) {
    const actor = await this.userRepository.findById(actorUserId);

    if (!actor || !actor.active) {
      throw new AppError(403, MENSAGENS.PROIBIDO);
    }

    return actor;
  }

  private async assertLeaderCanManage(
    actorUserId: string,
    targetUserId: string,
  ): Promise<void> {
    const canManage = await this.userRepository.canLeaderManageUser(
      actorUserId,
      targetUserId,
    );

    if (!canManage) {
      throw new AppError(403, MENSAGENS.PROIBIDO);
    }
  }

  private async assertCanManageTarget(
    actor: { id: string; role: UserRole },
    target: { id: string; role: UserRole },
  ): Promise<void> {
    if (actor.role === UserRole.ADMIN) {
      return;
    }

    if (actor.role !== UserRole.LEADER) {
      throw new AppError(403, MENSAGENS.PROIBIDO);
    }

    if (target.role === UserRole.ADMIN) {
      throw new AppError(403, MENSAGENS.PROIBIDO);
    }

    await this.assertLeaderCanManage(actor.id, target.id);
  }

  private async toSafeUsers(users: UserRecord[]): Promise<SafeUser[]> {
    const shifts = await this.shiftService.getCurrentByUserIds(
      users.map((user) => user.id),
    );

    return users.map((user) => {
      const shift = shifts.get(user.id);

      return toSafeUser(
        user,
        false,
        false,
        undefined,
        shift
          ? {
              startMinutes: shift.startMinutes,
              endMinutes: shift.endMinutes,
            }
          : null,
      );
    });
  }

  private async toSafeUserWithShift(user: UserRecord): Promise<SafeUser> {
    const [mapped] = await this.toSafeUsers([user]);
    return mapped;
  }

  async lookupEmployee(
    cardNumber: string,
    unit: EmployeeLookupResult['unit'],
  ): Promise<EmployeeLookupResult> {
    return this.employeeService.getByCardNumberAndUnit(cardNumber, unit);
  }

  async createUser(
    actorUserId: string,
    cardNumber: string,
    unit: EmployeeLookupResult['unit'],
    role: UserRole,
    teamId?: string,
  ): Promise<SafeUser> {
    const actor = await this.getActorOrThrow(actorUserId);

    if (
      actor.role === UserRole.LEADER &&
      (role === UserRole.ADMIN || role === UserRole.LEADER)
    ) {
      throw new AppError(403, MENSAGENS.PROIBIDO);
    }

    if (actor.role === UserRole.LEADER && teamId) {
      const membership = await this.teamRepository.findMembershipByTeamAndUser(
        teamId,
        actorUserId,
      );

      if (
        !membership ||
        membership.role !== TeamRole.ADMIN ||
        !membership.team.active
      ) {
        throw new AppError(403, MENSAGENS.PROIBIDO);
      }
    }

    const existing = await this.userRepository.findByUnitAndCardNumber(
      unit,
      cardNumber,
    );

    if (existing) {
      throw new AppError(409, MENSAGENS.USUARIO_JA_CADASTRADO);
    }

    const employee = await this.employeeService.getByCardNumberAndUnit(
      cardNumber,
      unit,
    );

    const initialShift = employee.shift
      ? {
          startMinutes: employee.shift.startMinutes,
          endMinutes: employee.shift.endMinutes,
          source: ShiftSource.API,
        }
      : null;

    const passwordHash = await bcrypt.hash(env.DEFAULT_PASSWORD, 10);

    const createData = {
      employeeId: toEmployeeId(employee.unit, employee.cardNumber),
      name: employee.name,
      unit: employee.unit,
      cardNumber: employee.cardNumber,
      passwordHash,
      role,
    };

    if (actor.role === UserRole.LEADER && teamId) {
      const user = await this.userRepository.createWithTeamMembership(
        createData,
        teamId,
        initialShift,
      );
      return this.toSafeUserWithShift(user);
    }

    const user = await this.userRepository.create(createData, initialShift);
    return this.toSafeUserWithShift(user);
  }

  async listUsers(actorUserId: string): Promise<SafeUser[]> {
    const actor = await this.getActorOrThrow(actorUserId);

    if (actor.role === UserRole.ADMIN) {
      const users = await this.userRepository.findAll();
      return this.toSafeUsers(users);
    }

    if (actor.role === UserRole.LEADER) {
      const users = await this.userRepository.findManagedByTeamAdmin(actorUserId);
      return this.toSafeUsers(users);
    }

    throw new AppError(403, MENSAGENS.PROIBIDO);
  }

  async updateRole(
    actorUserId: string,
    targetUserId: string,
    role: UserRole,
  ): Promise<SafeUser> {
    const actor = await this.getActorOrThrow(actorUserId);
    const targetUser = await this.userRepository.findById(targetUserId);

    if (!targetUser) {
      throw new AppError(404, MENSAGENS.USUARIO_NAO_ENCONTRADO);
    }

    if (!targetUser.active) {
      throw new AppError(400, MENSAGENS.REQUISICAO_INVALIDA);
    }

    await this.assertCanManageTarget(actor, targetUser);

    if (actor.role === UserRole.LEADER && role === UserRole.ADMIN) {
      throw new AppError(403, MENSAGENS.PROIBIDO);
    }

    if (
      targetUserId === actorUserId &&
      targetUser.role === UserRole.ADMIN &&
      role !== UserRole.ADMIN
    ) {
      const remainingAdmins = await this.userRepository.countActiveAdmins(
        actorUserId,
      );

      if (remainingAdmins === 0) {
        throw new AppError(400, MENSAGENS.ULTIMO_ADMIN_NAO_PODE_SER_ALTERADO);
      }
    }

    const updated = await this.userRepository.updateRole(targetUserId, {
      role,
    });
    return this.toSafeUserWithShift(updated);
  }

  async resetPassword(
    actorUserId: string,
    targetUserId: string,
  ): Promise<SafeUser> {
    const actor = await this.getActorOrThrow(actorUserId);
    const targetUser = await this.userRepository.findById(targetUserId);

    if (!targetUser) {
      throw new AppError(404, MENSAGENS.USUARIO_NAO_ENCONTRADO);
    }

    await this.assertCanManageTarget(actor, targetUser);

    const passwordHash = await bcrypt.hash(env.DEFAULT_PASSWORD, 10);
    const updated = await this.userRepository.resetPassword(
      targetUserId,
      passwordHash,
    );
    await this.refreshTokenRepository.revokeAllForUser(targetUserId);

    return this.toSafeUserWithShift(updated);
  }

  async deactivate(actorUserId: string, targetUserId: string): Promise<SafeUser> {
    if (actorUserId === targetUserId) {
      throw new AppError(400, MENSAGENS.NAO_PODE_ALTERAR_PROPRIO_ACESSO);
    }

    const actor = await this.getActorOrThrow(actorUserId);
    const targetUser = await this.userRepository.findById(targetUserId);

    if (!targetUser) {
      throw new AppError(404, MENSAGENS.USUARIO_NAO_ENCONTRADO);
    }

    if (!targetUser.active) {
      throw new AppError(400, MENSAGENS.REQUISICAO_INVALIDA);
    }

    await this.assertCanManageTarget(actor, targetUser);

    if (targetUser.role === UserRole.ADMIN) {
      const remainingAdmins = await this.userRepository.countActiveAdmins(
        targetUserId,
      );

      if (remainingAdmins === 0) {
        throw new AppError(400, MENSAGENS.ULTIMO_ADMIN_NAO_PODE_SER_ALTERADO);
      }
    }

    const updated = await this.userRepository.setActive(targetUserId, false);
    await this.refreshTokenRepository.revokeAllForUser(targetUserId);
    await stopUnfinishedTimeEntriesForUser(
      this.timeEntryRepository,
      this.taskRepository,
      this.cardRepository,
      targetUserId,
    );
    return this.toSafeUserWithShift(updated);
  }

  async reactivate(
    actorUserId: string,
    targetUserId: string,
  ): Promise<SafeUser> {
    const actor = await this.getActorOrThrow(actorUserId);
    const targetUser = await this.userRepository.findById(targetUserId);

    if (!targetUser) {
      throw new AppError(404, MENSAGENS.USUARIO_NAO_ENCONTRADO);
    }

    if (targetUser.active) {
      throw new AppError(400, MENSAGENS.REQUISICAO_INVALIDA);
    }

    await this.assertCanManageTarget(actor, targetUser);

    const updated = await this.userRepository.setActive(targetUserId, true);
    return this.toSafeUserWithShift(updated);
  }

  async updateShift(
    actorUserId: string,
    targetUserId: string,
    start: string,
    end: string,
  ): Promise<SafeUser> {
    const actor = await this.getActorOrThrow(actorUserId);
    const targetUser = await this.userRepository.findById(targetUserId);

    if (!targetUser) {
      throw new AppError(404, MENSAGENS.USUARIO_NAO_ENCONTRADO);
    }

    await this.assertCanManageTarget(actor, targetUser);
    await this.shiftService.setManualShift(targetUserId, start, end);

    return this.toSafeUserWithShift(targetUser);
  }

  async syncShifts(actorUserId: string): Promise<{
    synced: number;
    updated: number;
  }> {
    const actor = await this.getActorOrThrow(actorUserId);

    if (actor.role !== UserRole.ADMIN) {
      throw new AppError(403, MENSAGENS.PROIBIDO);
    }

    return this.shiftService.syncFromExternal();
  }
}
