import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { AppError } from '../utils/errors.js';

export type AccountMail = { to: string; subject: string; text: string; html: string };
export type AccountMailer = (mail: AccountMail) => Promise<void>;

let transport: ReturnType<typeof nodemailer.createTransport> | undefined;

export const sendAccountMail: AccountMailer = async (mail) => {
  if (!env.CORREIO || !env.EMAIL_AUTOMACAO || !env.PASSWORD_AUTOMACAO) {
    throw new AppError(503, 'O envio de e-mails está indisponível. Tente novamente mais tarde.');
  }
  transport ??= nodemailer.createTransport({
    host: env.CORREIO,
    port: env.PORT_CORREIO,
    secure: env.PORT_CORREIO === 465,
    requireTLS: env.NODE_ENV === 'production' && env.PORT_CORREIO !== 465,
    auth: { user: env.EMAIL_AUTOMACAO, pass: env.PASSWORD_AUTOMACAO },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
    logger: false,
    debug: false,
  });
  await transport.sendMail({ ...mail, from: { name: 'Kairo', address: env.EMAIL_AUTOMACAO } });
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]!);
}

export function accountMail(to: string, name: string, subject: string, body: string, action?: { label: string; url: string }): AccountMail {
  const text = `Olá, ${name}.\n\n${body}${action ? `\n\n${action.label}: ${action.url}` : ''}\n\nEquipe Kairo`;
  return {
    to, subject, text,
    html: `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"></head><body style="margin:0;background:#f4f6f8;font-family:Arial,sans-serif;color:#172033"><div style="max-width:520px;margin:32px auto;padding:32px;background:white;border-radius:12px"><h2 style="color:#245bce">Kairo</h2><h1 style="font-size:22px">${escapeHtml(subject)}</h1><p>Olá, ${escapeHtml(name)}.</p><p style="line-height:1.6">${escapeHtml(body)}</p>${action ? `<p style="margin:28px 0"><a href="${escapeHtml(action.url)}" style="background:#245bce;color:white;padding:12px 20px;border-radius:6px;text-decoration:none">${escapeHtml(action.label)}</a></p><p style="font-size:12px;word-break:break-all">Se o botão não funcionar, copie e cole este link no navegador:<br>${escapeHtml(action.url)}</p>` : ''}<p style="color:#64748b;font-size:12px">Equipe Kairo</p></div></body></html>`,
  };
}
