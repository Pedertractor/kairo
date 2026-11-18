import type { FastifyInstance, FastifyPluginOptions, FastifyReply, FastifyRequest } from 'fastify';
import type { ZodType } from 'zod';
import type { AccountMailer } from '../lib/account-mailer.js';
import { actionTokenSchema, forgotPasswordSchema, resetPasswordSchema, updateProfileSchema } from '../schemas/account.schema.js';
import { AccountService } from '../services/account.service.js';
import { AppError, handleControllerError } from '../utils/errors.js';
import { MENSAGENS, sendSuccess } from '../utils/response.js';

interface AccountRouteOptions extends FastifyPluginOptions { mailer?: AccountMailer }

export async function accountRoutes(app: FastifyInstance, options: AccountRouteOptions) {
  const service = new AccountService(app.prisma, options.mailer);
  const attempts = new Map<string, { count: number; until: number }>();
  const limit = async (request: FastifyRequest, reply: FastifyReply) => {
    const now = Date.now();
    for (const [key, value] of attempts) if (value.until <= now) attempts.delete(key);
    const entry = attempts.get(request.ip) ?? { count: 0, until: now + 60_000 };
    if (entry.count >= 20 || (!attempts.has(request.ip) && attempts.size >= 10_000)) {
      reply.header('Retry-After', 60);
      throw new AppError(429, 'Muitas tentativas. Aguarde um minuto.');
    }
    entry.count++;
    attempts.set(request.ip, entry);
  };
  const authenticated = { bodyLimit: 8192, preHandler: [app.authenticate, limit] };
  const publicAction = { bodyLimit: 8192, preHandler: [limit] };

  function parse<T>(schema: ZodType<T>, body: unknown): T {
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      throw new AppError(400, parsed.error.issues.some((issue) => issue.message === MENSAGENS.SENHAS_NAO_COINCIDEM)
        ? MENSAGENS.SENHAS_NAO_COINCIDEM : MENSAGENS.REQUISICAO_INVALIDA);
    }
    return parsed.data;
  }
  function handler(action: (request: FastifyRequest, reply: FastifyReply) => Promise<unknown>) {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      reply.header('Cache-Control', 'no-store');
      try { return await action(request, reply); }
      catch (error) {
        if (error instanceof AppError && error.statusCode === 429) reply.header('Retry-After', 60);
        return handleControllerError(error, reply);
      }
    };
  }

  app.get('/auth/me/profile', { preHandler: [app.authenticate] }, handler(async (request, reply) =>
    sendSuccess(reply, { profile: await service.getProfile(request.user.sub) })));

  app.patch('/auth/me/profile', authenticated, handler(async (request, reply) => {
    const { email } = parse(updateProfileSchema, request.body);
    const profile = await service.updateEmail(request.user.sub, email);
    return sendSuccess(reply, { profile }, 200, profile.pendingEmail
      ? 'Enviamos um link para confirmar seu e-mail.' : 'Perfil atualizado com sucesso.');
  }));

  app.post('/auth/me/profile/resend-email-verification', authenticated, handler(async (request, reply) => {
    await service.resendVerification(request.user.sub);
    return sendSuccess(reply, null, 200, 'Enviamos um novo link de confirmação.');
  }));

  app.post('/auth/verify-email', publicAction, handler(async (request, reply) => {
    await service.verifyEmail(parse(actionTokenSchema, request.body).token);
    return sendSuccess(reply, null, 200, 'E-mail confirmado com sucesso.');
  }));

  app.post('/auth/forgot-password', publicAction, handler(async (request, reply) => {
    const result = await service.forgotPassword(parse(forgotPasswordSchema, request.body));
    const message = {
      sent: 'Se os dados estiverem corretos, você receberá um link no e-mail cadastrado.',
      no_email: 'Não há e-mail cadastrado para esta conta. Contate a equipe de automação para redefinir sua senha.',
      verification_pending: 'Seu e-mail ainda não foi confirmado. Reenviamos a confirmação. Confirme o endereço e solicite a recuperação novamente.',
    }[result.status];
    return sendSuccess(reply, result, 200, message);
  }));

  app.post('/auth/reset-password', publicAction, handler(async (request, reply) => {
    await service.resetPassword(parse(resetPasswordSchema, request.body));
    return sendSuccess(reply, null, 200, 'Senha redefinida. Entre com sua nova senha.');
  }));
}
