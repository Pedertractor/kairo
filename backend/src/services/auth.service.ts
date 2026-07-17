import { createHash, randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';
import type { User } from '../generated/client.js';
import { RefreshTokenRepository } from '../repositories/refresh-token.repository.js';
import { UserRepository } from '../repositories/user.repository.js';
import type { ChangePasswordInput, LoginInput } from '../types/auth.types.js';

import { addDuration } from '../utils/duration.js';
import { AppError } from '../utils/errors.js';
import { MENSAGENS } from '../utils/response.js';
import { toSafeUser } from '../utils/user.js';

function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function generateRefreshToken(): string {
  return randomBytes(48).toString('base64url');
}

export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly refreshTokenRepository: RefreshTokenRepository,
  ) {}

  private async toAuthenticatedUser(user: User) {
    const hasOwnedTeams = await this.userRepository.hasOwnedTeams(user.id);
    return toSafeUser(user, hasOwnedTeams);
  }

  async login({ cardNumber, unit, password }: LoginInput) {
    const user = await this.userRepository.findByUnitAndCardNumber(
      unit,
      cardNumber,
    );

    if (!user || !user.active) {
      throw new AppError(401, MENSAGENS.CREDENCIAIS_INVALIDAS);
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatches) {
      throw new AppError(401, MENSAGENS.CREDENCIAIS_INVALIDAS);
    }

    return this.toAuthenticatedUser(user);
  }

  async changePassword(input: ChangePasswordInput) {
    const { cardNumber, unit, currentPassword, newPassword } = input;
    const user = await this.userRepository.findByUnitAndCardNumber(
      unit,
      cardNumber,
    );

    if (!user || !user.active) {
      throw new AppError(401, MENSAGENS.CREDENCIAIS_INVALIDAS);
    }

    const passwordMatches = await bcrypt.compare(
      currentPassword,
      user.passwordHash,
    );

    if (!passwordMatches) {
      throw new AppError(401, MENSAGENS.CREDENCIAIS_INVALIDAS);
    }

    if (!user.firstLogin) {
      return {
        user: await this.toAuthenticatedUser(user),
        passwordChanged: false,
      };
    }

    if (newPassword === env.DEFAULT_PASSWORD) {
      throw new AppError(400, MENSAGENS.SENHA_IGUAL_PADRAO);
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    const updated = await this.userRepository.updatePassword(
      user.id,
      passwordHash,
    );

    return {
      user: await this.toAuthenticatedUser(updated),
      passwordChanged: true,
    };
  }

  async getAuthenticatedUser(userId: string) {
    const user = await this.userRepository.findById(userId);

    if (!user || !user.active) {
      throw new AppError(401, MENSAGENS.NAO_AUTORIZADO);
    }

    return this.toAuthenticatedUser(user);
  }

  async validateUserForToken(user: User | null) {
    if (!user || !user.active) {
      throw new AppError(401, MENSAGENS.NAO_AUTORIZADO);
    }

    return this.toAuthenticatedUser(user);
  }

  async issueRefreshToken(userId: string): Promise<string> {
    const plainToken = generateRefreshToken();
    const tokenHash = hashRefreshToken(plainToken);
    const expiresAt = addDuration(new Date(), env.JWT_REFRESH_EXPIRES_IN);

    await this.refreshTokenRepository.create({
      userId,
      tokenHash,
      expiresAt,
    });

    return plainToken;
  }

  async rotateRefreshToken(plainToken: string) {
    const tokenHash = hashRefreshToken(plainToken);
    const existing =
      await this.refreshTokenRepository.findByTokenHash(tokenHash);

    if (!existing) {
      throw new AppError(401, MENSAGENS.REFRESH_TOKEN_INVALIDO);
    }

    if (existing.revokedAt) {
      await this.refreshTokenRepository.revokeAllForUser(existing.userId);
      throw new AppError(401, MENSAGENS.REFRESH_TOKEN_INVALIDO);
    }

    if (existing.expiresAt.getTime() <= Date.now()) {
      await this.refreshTokenRepository.revoke(existing.id);
      throw new AppError(401, MENSAGENS.REFRESH_TOKEN_INVALIDO);
    }

    if (!existing.user.active) {
      await this.refreshTokenRepository.revokeAllForUser(existing.userId);
      throw new AppError(401, MENSAGENS.NAO_AUTORIZADO);
    }

    const nextPlainToken = generateRefreshToken();
    const nextHash = hashRefreshToken(nextPlainToken);
    const expiresAt = addDuration(new Date(), env.JWT_REFRESH_EXPIRES_IN);

    const created = await this.refreshTokenRepository.create({
      userId: existing.userId,
      tokenHash: nextHash,
      expiresAt,
    });

    await this.refreshTokenRepository.revoke(existing.id, created.id);

    return {
      user: toSafeUser(existing.user),
      refreshToken: nextPlainToken,
    };
  }

  async revokeRefreshToken(plainToken: string | undefined, userId: string) {
    if (plainToken) {
      const existing = await this.refreshTokenRepository.findByTokenHash(
        hashRefreshToken(plainToken),
      );

      if (existing && existing.userId === userId && !existing.revokedAt) {
        await this.refreshTokenRepository.revoke(existing.id);
        return;
      }
    }

    await this.refreshTokenRepository.revokeAllForUser(userId);
  }

  revokeAllUserTokens(userId: string) {
    return this.refreshTokenRepository.revokeAllForUser(userId);
  }
}
