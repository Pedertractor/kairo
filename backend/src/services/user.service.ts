import bcrypt from 'bcryptjs';
import { UserRole } from '../generated/client.js';
import { env } from '../config/env.js';
import { EmployeeService } from './employee.service.js';
import { RefreshTokenRepository } from '../repositories/refresh-token.repository.js';
import { TaskRepository } from '../repositories/task.repository.js';
import { TimeEntryRepository } from '../repositories/time-entry.repository.js';
import { UserRepository } from '../repositories/user.repository.js';
import type { SafeUser } from '../types/auth.types.js';
import type { EmployeeLookupResult } from '../types/employee.types.js';
import { AppError } from '../utils/errors.js';
import { MENSAGENS } from '../utils/response.js';
import { toEmployeeId, toSafeUser } from '../utils/user.js';
import { releaseTaskIfIdle } from './task-status-sync.js';

export class UserService {
  private readonly employeeService = new EmployeeService();

  constructor(
    private readonly userRepository: UserRepository,
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly timeEntryRepository: TimeEntryRepository,
    private readonly taskRepository: TaskRepository,
  ) {}

  /** Closes a leftover running timer so it never holds a task open. */
  private async stopActiveTimer(userId: string): Promise<void> {
    const activeEntry =
      await this.timeEntryRepository.findActiveByUserId(userId);

    if (!activeEntry) {
      return;
    }

    await this.timeEntryRepository.stopEntry(activeEntry, new Date());
    await releaseTaskIfIdle(
      this.timeEntryRepository,
      this.taskRepository,
      activeEntry.taskId,
    );
  }

  async lookupEmployee(
    cardNumber: string,
    unit: EmployeeLookupResult['unit'],
  ): Promise<EmployeeLookupResult> {
    return this.employeeService.getByCardNumberAndUnit(cardNumber, unit);
  }

  async createUser(
    cardNumber: string,
    unit: EmployeeLookupResult['unit'],
    printerOperator = false,
  ): Promise<SafeUser> {
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

    const passwordHash = await bcrypt.hash(env.DEFAULT_PASSWORD, 10);

    const user = await this.userRepository.create({
      employeeId: toEmployeeId(employee.unit, employee.cardNumber),
      name: employee.name,
      unit: employee.unit,
      cardNumber: employee.cardNumber,
      passwordHash,
      role: UserRole.USER,
      printerOperator,
    });

    return toSafeUser(user);
  }

  async listUsers(): Promise<SafeUser[]> {
    const users = await this.userRepository.findAll();
    return users.map((user) => toSafeUser(user));
  }

  async updateRole(
    actorUserId: string,
    targetUserId: string,
    role: UserRole,
    printerOperator: boolean,
  ): Promise<SafeUser> {
    const targetUser = await this.userRepository.findById(targetUserId);

    if (!targetUser) {
      throw new AppError(404, MENSAGENS.USUARIO_NAO_ENCONTRADO);
    }

    if (!targetUser.active) {
      throw new AppError(400, MENSAGENS.REQUISICAO_INVALIDA);
    }

    if (
      targetUserId === actorUserId &&
      targetUser.role === UserRole.ADMIN &&
      role === UserRole.USER
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
      printerOperator,
    });
    return toSafeUser(updated);
  }

  async resetPassword(targetUserId: string): Promise<SafeUser> {
    const targetUser = await this.userRepository.findById(targetUserId);

    if (!targetUser) {
      throw new AppError(404, MENSAGENS.USUARIO_NAO_ENCONTRADO);
    }

    const passwordHash = await bcrypt.hash(env.DEFAULT_PASSWORD, 10);
    const updated = await this.userRepository.resetPassword(
      targetUserId,
      passwordHash,
    );
    await this.refreshTokenRepository.revokeAllForUser(targetUserId);

    return toSafeUser(updated);
  }

  async deactivate(actorUserId: string, targetUserId: string): Promise<SafeUser> {
    if (actorUserId === targetUserId) {
      throw new AppError(400, MENSAGENS.NAO_PODE_ALTERAR_PROPRIO_ACESSO);
    }

    const targetUser = await this.userRepository.findById(targetUserId);

    if (!targetUser) {
      throw new AppError(404, MENSAGENS.USUARIO_NAO_ENCONTRADO);
    }

    if (!targetUser.active) {
      throw new AppError(400, MENSAGENS.REQUISICAO_INVALIDA);
    }

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
    await this.stopActiveTimer(targetUserId);
    return toSafeUser(updated);
  }

  async reactivate(targetUserId: string): Promise<SafeUser> {
    const targetUser = await this.userRepository.findById(targetUserId);

    if (!targetUser) {
      throw new AppError(404, MENSAGENS.USUARIO_NAO_ENCONTRADO);
    }

    if (targetUser.active) {
      throw new AppError(400, MENSAGENS.REQUISICAO_INVALIDA);
    }

    const updated = await this.userRepository.setActive(targetUserId, true);
    return toSafeUser(updated);
  }
}
