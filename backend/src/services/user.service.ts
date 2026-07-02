import bcrypt from 'bcryptjs';
import { UserRole } from '../generated/client.js';
import { env } from '../config/env.js';
import { UserRepository } from '../repositories/user.repository.js';
import type { SafeUser } from '../types/auth.types.js';
import { AppError } from '../utils/errors.js';
import { MENSAGENS } from '../utils/response.js';
import { toSafeUser } from '../utils/user.js';

export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  async listUsers(): Promise<SafeUser[]> {
    const users = await this.userRepository.findAll();
    return users.map(toSafeUser);
  }

  async updateRole(
    actorUserId: string,
    targetUserId: string,
    role: UserRole,
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

    const updated = await this.userRepository.updateRole(targetUserId, role);
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
