export interface ContactProfile {
  email: string | null
  verifiedAt: string | null
  pendingEmail: string | null
}

export interface ProfileResponse { profile: ContactProfile }
export interface RecoveryResponse { status: 'sent' | 'no_email' | 'verification_pending' }

export const RECOVERY_MESSAGES: Record<RecoveryResponse['status'], string> = {
  sent: 'Se os dados estiverem corretos, você receberá um link no e-mail cadastrado.',
  no_email: 'Não há e-mail cadastrado para esta conta. Contate a equipe de automação para redefinir sua senha.',
  verification_pending: 'Seu e-mail ainda não foi confirmado. Reenviamos a confirmação. Confirme o endereço e solicite a recuperação novamente.',
}
