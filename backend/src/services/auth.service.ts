import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';
import type { User } from '../generated/client.js';
import { UserRepository } from '../repositories/user.repository.js';
import type { ChangePasswordInput, LoginInput } from '../types/auth.types.js';
import { AppError } from '../utils/errors.js';
import { MENSAGENS } from '../utils/response.js';
import { toSafeUser } from '../utils/user.js';

export class AuthService {
  constructor(private readonly userRepository: UserRepository) {}

  async login({ cardNumber, unit, password }: LoginInput) {
    const user = await this.userRepository.findByUnitAndCardNumber(unit, cardNumber);

    if (!user || !user.active) {
      throw new AppError(401, MENSAGENS.CREDENCIAIS_INVALIDAS);
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatches) {
      throw new AppError(401, MENSAGENS.CREDENCIAIS_INVALIDAS);
    }

    return toSafeUser(user);
  }

  async changePassword(input: ChangePasswordInput) {
    const { cardNumber, unit, currentPassword, newPassword } = input;
    const user = await this.userRepository.findByUnitAndCardNumber(unit, cardNumber);

    if (!user || !user.active) {
      throw new AppError(401, MENSAGENS.CREDENCIAIS_INVALIDAS);
    }

    const passwordMatches = await bcrypt.compare(currentPassword, user.passwordHash);

    if (!passwordMatches) {
      throw new AppError(401, MENSAGENS.CREDENCIAIS_INVALIDAS);
    }

    if (!user.firstLogin) {
      return { user: toSafeUser(user), passwordChanged: false };
    }

    if (newPassword === env.DEFAULT_PASSWORD) {
      throw new AppError(400, MENSAGENS.SENHA_IGUAL_PADRAO);
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    const updated = await this.userRepository.updatePassword(user.id, passwordHash);

    return { user: toSafeUser(updated), passwordChanged: true };
  }

  async getAuthenticatedUser(userId: string) {
    const user = await this.userRepository.findById(userId);

    if (!user || !user.active) {
      throw new AppError(401, MENSAGENS.NAO_AUTORIZADO);
    }

    return toSafeUser(user);
  }

  validateUserForToken(user: User | null) {
    if (!user || !user.active) {
      throw new AppError(401, MENSAGENS.NAO_AUTORIZADO);
    }

    return toSafeUser(user);
  }
}
