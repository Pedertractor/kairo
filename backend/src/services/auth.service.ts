import bcrypt from 'bcryptjs';
import type { User } from '../generated/client.js';
import { UserRepository } from '../repositories/user.repository.js';
import type { LoginInput } from '../types/auth.types.js';
import { AppError } from '../utils/errors.js';
import { MENSAGENS } from '../utils/response.js';
import { toSafeUser } from '../utils/user.js';

export class AuthService {
  constructor(private readonly userRepository: UserRepository) {}

  async login({ employeeId, password }: LoginInput) {
    const user = await this.userRepository.findByEmployeeId(employeeId);

    if (!user || !user.active) {
      throw new AppError(401, MENSAGENS.CREDENCIAIS_INVALIDAS);
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatches) {
      throw new AppError(401, MENSAGENS.CREDENCIAIS_INVALIDAS);
    }

    return toSafeUser(user);
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
