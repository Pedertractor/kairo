import type { FastifyReply, FastifyRequest } from 'fastify';
import { UserRole } from '../generated/client.js';
import { UserRepository } from '../repositories/user.repository.js';
import { AppError } from '../utils/errors.js';
import { MENSAGENS } from '../utils/response.js';

export function createRequireAdminOrLeader(userRepository: UserRepository) {
  return async (request: FastifyRequest, _reply: FastifyReply) => {
    const user = await userRepository.findById(request.user.sub);

    if (
      !user ||
      !user.active ||
      (user.role !== UserRole.ADMIN && user.role !== UserRole.LEADER)
    ) {
      throw new AppError(403, MENSAGENS.PROIBIDO);
    }
  };
}
