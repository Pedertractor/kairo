import type { FastifyReply, FastifyRequest } from 'fastify';
import type { UserRole } from '../generated/client.js';
import { UserRepository } from '../repositories/user.repository.js';
import { AppError } from '../utils/errors.js';
import { MENSAGENS } from '../utils/response.js';

export function createRequireRoles(
  userRepository: UserRepository,
  roles: readonly UserRole[],
) {
  return async (request: FastifyRequest, _reply: FastifyReply) => {
    const user = await userRepository.findById(request.user.sub);

    if (!user || !user.active || !roles.includes(user.role)) {
      throw new AppError(403, MENSAGENS.PROIBIDO);
    }
  };
}
