import { createHash, randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';
import type { AccountActionPurpose, Prisma, PrismaClient, UnitType, User, UserEmail } from '../generated/client.js';
import { accountMail, sendAccountMail, type AccountMailer } from '../lib/account-mailer.js';
import { AppError } from '../utils/errors.js';
import { MENSAGENS } from '../utils/response.js';

const INVALID_LINK = 'Este link é inválido ou expirou. Solicite um novo link.';
const HOUR = 60 * 60 * 1000;
const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex');
type IssuedAction = { token: string; id: string; email: string; name: string; purpose: AccountActionPurpose };

function profileData(profile: UserEmail | null) {
  return {
    email: profile?.email ?? null,
    verifiedAt: profile?.verifiedAt?.toISOString() ?? null,
    pendingEmail: profile?.pendingEmail ?? null,
  };
}

export class AccountService {
  constructor(private readonly prisma: PrismaClient, private readonly mailer: AccountMailer = sendAccountMail) {}

  // All changes for an account take the same row lock, including token issuance.
  // This prevents concurrent sends from bypassing the cooldown and double resets.
  private withAccount<T>(userId: string, work: (tx: Prisma.TransactionClient, user: User) => Promise<T>) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "users" WHERE "id" = ${userId} FOR UPDATE`;
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user?.active || user.production) throw new AppError(403, MENSAGENS.PROIBIDO);
      return work(tx, user);
    });
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.active || user.production) throw new AppError(403, MENSAGENS.PROIBIDO);
    return profileData(await this.prisma.userEmail.findUnique({ where: { userId } }));
  }

  private async issue(tx: Prisma.TransactionClient, user: User, email: string, purpose: AccountActionPurpose): Promise<IssuedAction> {
    const now = new Date();
    const recent = await tx.accountActionToken.findMany({
      where: { userId: user.id, createdAt: { gt: new Date(now.getTime() - HOUR) } },
      select: { createdAt: true }, orderBy: { createdAt: 'desc' },
    });
    if (recent.length >= 5 || (recent[0] && now.getTime() - recent[0].createdAt.getTime() < 60_000)) {
      throw new AppError(429, recent.length >= 5
        ? 'Limite de envios atingido. Tente novamente em uma hora.'
        : 'Aguarde um minuto antes de solicitar outro e-mail.');
    }
    await tx.accountActionToken.updateMany({
      where: { userId: user.id, purpose, usedAt: null }, data: { usedAt: now },
    });
    const token = randomBytes(32).toString('base64url');
    const record = await tx.accountActionToken.create({ data: {
      userId: user.id, purpose, targetEmail: email, tokenHash: tokenHash(token),
      authVersion: user.authVersion,
      expiresAt: new Date(now.getTime() + (purpose === 'EMAIL_VERIFICATION' ? 24 * HOUR : HOUR / 2)),
    } });
    return { token, id: record.id, email, name: user.name, purpose };
  }

  private async deliver(action: IssuedAction) {
    const verification = action.purpose === 'EMAIL_VERIFICATION';
    const baseUrl = (env.PUBLIC_FRONTEND_URL ?? 'http://localhost:5173').replace(/\/$/, '');
    // Fragments are not sent to the web server or included in Referer headers.
    const url = `${baseUrl}/${verification ? 'confirmar-email' : 'redefinir-senha'}#token=${action.token}`;
    try {
      await this.mailer(accountMail(action.email, action.name,
        verification ? 'Confirme seu e-mail no Kairo' : 'Redefina sua senha no Kairo',
        verification
          ? 'Confirme este endereço para usá-lo na recuperação da sua senha. O link é válido por 24 horas. Se você não solicitou este cadastro, ignore esta mensagem.'
          : 'Use o link para definir uma nova senha. Ele é válido por 30 minutos e pode ser usado uma única vez. Se você não solicitou a recuperação, ignore esta mensagem.',
        { label: verification ? 'Confirmar e-mail' : 'Redefinir senha', url }));
    } catch {
      // Never log SMTP credentials, message bodies or bearer tokens.
      await this.prisma.accountActionToken.updateMany({ where: { id: action.id, usedAt: null }, data: { usedAt: new Date() } });
      throw new AppError(503, 'Não foi possível enviar o e-mail. Tente novamente mais tarde.');
    }
  }

  async updateEmail(userId: string, email: string | null) {
    const result = await this.withAccount(userId, async (tx, user) => {
      const current = await tx.userEmail.findUnique({ where: { userId } });
      const alreadyVerified = email !== null && email === current?.email && current.verifiedAt !== null;
      if (email === null || alreadyVerified) {
        const profile = await tx.userEmail.upsert({
          where: { userId }, create: { userId },
          update: email === null ? { email: null, verifiedAt: null, pendingEmail: null } : { pendingEmail: null },
        });
        await tx.accountActionToken.updateMany({
          where: { userId, usedAt: null, ...(email === null ? {} : { purpose: 'EMAIL_VERIFICATION' as const }) },
          data: { usedAt: new Date() },
        });
        return { profile: profileData(profile), action: null };
      }
      const action = await this.issue(tx, user, email, 'EMAIL_VERIFICATION');
      const profile = await tx.userEmail.upsert({
        where: { userId }, create: { userId, pendingEmail: email }, update: { pendingEmail: email },
      });
      return { profile: profileData(profile), action };
    });
    if (result.action) await this.deliver(result.action);
    return result.profile;
  }

  async resendVerification(userId: string) {
    const action = await this.withAccount(userId, async (tx, user) => {
      const profile = await tx.userEmail.findUnique({ where: { userId } });
      if (!profile?.pendingEmail) throw new AppError(400, 'Não há e-mail pendente de confirmação.');
      return this.issue(tx, user, profile.pendingEmail, 'EMAIL_VERIFICATION');
    });
    await this.deliver(action);
  }

  async forgotPassword(input: { cardNumber: string; unit: UnitType }) {
    const user = await this.prisma.user.findUnique({ where: { unit_cardNumber: input } });
    if (!user?.active || user.production) return { status: 'sent' as const };
    const result = await this.withAccount(user.id, async (tx, lockedUser) => {
      const profile = await tx.userEmail.findUnique({ where: { userId: user.id } });
      const confirmed = profile?.email && profile.verifiedAt ? profile.email : null;
      const email = confirmed ?? profile?.pendingEmail;
      if (!email) return null;
      return this.issue(tx, lockedUser, email, confirmed ? 'PASSWORD_RESET' : 'EMAIL_VERIFICATION');
    });
    if (!result) return { status: 'no_email' as const };
    await this.deliver(result);
    return { status: result.purpose === 'PASSWORD_RESET' ? 'sent' as const : 'verification_pending' as const };
  }

  private async findAction(token: string, purpose: AccountActionPurpose) {
    const action = await this.prisma.accountActionToken.findUnique({ where: { tokenHash: tokenHash(token) } });
    if (!action || action.purpose !== purpose || action.usedAt || action.expiresAt <= new Date()) {
      throw new AppError(400, INVALID_LINK);
    }
    return action;
  }

  private async consume(tx: Prisma.TransactionClient, user: User, actionId: string, version: number) {
    if (user.authVersion !== version) throw new AppError(400, INVALID_LINK);
    const consumed = await tx.accountActionToken.updateMany({
      where: { id: actionId, usedAt: null, expiresAt: { gt: new Date() } }, data: { usedAt: new Date() },
    });
    if (consumed.count !== 1) throw new AppError(400, INVALID_LINK);
  }

  async verifyEmail(token: string) {
    const action = await this.findAction(token, 'EMAIL_VERIFICATION');
    await this.withAccount(action.userId, async (tx, user) => {
      const profile = await tx.userEmail.findUnique({ where: { userId: user.id } });
      if (profile?.pendingEmail !== action.targetEmail) throw new AppError(400, INVALID_LINK);
      await this.consume(tx, user, action.id, action.authVersion);
      await tx.userEmail.update({ where: { userId: user.id }, data: {
        email: action.targetEmail, verifiedAt: new Date(), pendingEmail: null,
      } });
      await tx.accountActionToken.updateMany({ where: { userId: user.id, usedAt: null }, data: { usedAt: new Date() } });
    });
  }

  async resetPassword(input: { token: string; newPassword: string }) {
    if (input.newPassword === env.DEFAULT_PASSWORD) throw new AppError(400, MENSAGENS.SENHA_IGUAL_PADRAO);
    const action = await this.findAction(input.token, 'PASSWORD_RESET');
    const passwordHash = await bcrypt.hash(input.newPassword, 10);
    const user = await this.withAccount(action.userId, async (tx, user) => {
      const profile = await tx.userEmail.findUnique({ where: { userId: user.id } });
      if (!profile?.verifiedAt || profile.email !== action.targetEmail) throw new AppError(400, INVALID_LINK);
      await this.consume(tx, user, action.id, action.authVersion);
      await tx.user.update({ where: { id: user.id }, data: { passwordHash, firstLogin: false, authVersion: { increment: 1 } } });
      await tx.refreshToken.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } });
      await tx.productionSession.deleteMany({ where: { userId: user.id } });
      await tx.accountActionToken.updateMany({ where: { userId: user.id, usedAt: null }, data: { usedAt: new Date() } });
      return user;
    });
    // A notification failure must not turn an already committed reset into an error.
    try {
      await this.mailer(accountMail(action.targetEmail, user.name, 'Sua senha do Kairo foi redefinida',
        'Sua senha foi redefinida e as sessões anteriores foram encerradas. Se você não fez esta alteração, contate a equipe de automação imediatamente.'));
    } catch { /* The password reset has already succeeded. */ }
  }
}
