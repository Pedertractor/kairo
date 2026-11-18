import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { CheckCircle2Icon, KeyRoundIcon, MailCheckIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, FieldLabel } from '@/components/ui/field'
import { PasswordInput } from '@/components/password-input'
import { KairoBrand } from '@/components/kairo-brand'
import { useAuth } from '@/hooks/use-auth'
import { api } from '@/lib/api-handler'
import { clearStoredToken } from '@/lib/auth-storage'

export function AccountActionPage({ mode }: { mode: 'confirm' | 'reset' }) {
  const { isAuthenticated, refreshUser } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const actionVersion = useRef(0)
  const [token, setToken] = useState(() => new URLSearchParams(location.hash.slice(1)).get('token') ?? '')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const validToken = /^[A-Za-z0-9_-]{43}$/.test(token)
  const [error, setError] = useState(validToken ? '' : 'Este link é inválido. Solicite um novo link no Kairo.')

  useEffect(() => {
    if (!location.hash) return
    const nextToken = new URLSearchParams(location.hash.slice(1)).get('token') ?? ''
    actionVersion.current++
    setToken(nextToken)
    setDone(false)
    setBusy(false)
    setNewPassword('')
    setConfirmPassword('')
    setError(/^[A-Za-z0-9_-]{43}$/.test(nextToken) ? '' : 'Este link é inválido. Solicite um novo link no Kairo.')
    void navigate(location.pathname + location.search, { replace: true })
  }, [location.hash, location.pathname, location.search, navigate])

  useEffect(() => {
    const meta = document.createElement('meta')
    meta.name = 'referrer'
    meta.content = 'no-referrer'
    document.head.appendChild(meta)
    return () => meta.remove()
  }, [])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!validToken) return
    if (mode === 'reset' && newPassword !== confirmPassword) { setError('As senhas não coincidem.'); return }
    setBusy(true)
    setError('')
    const version = actionVersion.current
    try {
      await api(mode === 'confirm' ? '/auth/verify-email' : '/auth/reset-password', {
        method: 'POST', toastOnError: false, toastOnSuccess: false,
        body: JSON.stringify(mode === 'confirm' ? { token } : { token, newPassword, confirmPassword }),
      })
      if (version !== actionVersion.current) return
      setDone(true)
      if (mode === 'reset') {
        clearStoredToken()
        window.dispatchEvent(new Event('kairo:session-expired'))
      } else if (isAuthenticated) {
        try { await refreshUser() } catch { /* Confirmation also works outside a session. */ }
      }
    } catch (failure) {
      if (version === actionVersion.current) setError(failure instanceof Error ? failure.message : 'Não foi possível concluir. Tente novamente.')
    } finally { if (version === actionVersion.current) setBusy(false) }
  }

  const confirmation = mode === 'confirm'
  const Icon = done ? CheckCircle2Icon : confirmation ? MailCheckIcon : KeyRoundIcon
  const content = confirmation ? {
    title: 'Confirme seu e-mail',
    description: 'Confirme este endereço para receber os links de recuperação da sua conta.',
    completedTitle: 'E-mail confirmado',
    completedDescription: 'Seu endereço já pode ser usado para recuperar a senha. Se necessário, solicite a recuperação na tela de login.',
    action: 'Confirmar e-mail',
  } : {
    title: 'Defina sua nova senha',
    description: 'Crie uma senha pessoal para voltar a acessar sua conta.',
    completedTitle: 'Senha redefinida',
    completedDescription: 'As sessões anteriores foram encerradas. Entre com sua nova senha para continuar.',
    action: 'Salvar nova senha',
  }
  return (
    <div className="flex min-h-svh flex-col bg-muted/20 p-6 md:p-10">
      <KairoBrand />
      <main className="flex flex-1 items-center justify-center py-10">
        <div className="w-full max-w-sm space-y-6 rounded-xl border bg-card p-6 shadow-sm">
          <div className="space-y-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-brand-soft text-sidebar-primary">
              <Icon className="size-6" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">{done ? content.completedTitle : content.title}</h1>
            <p className="text-sm text-muted-foreground">{done ? content.completedDescription : content.description}</p>
          </div>
          {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
          {!done ? (
            <form onSubmit={(event) => void submit(event)} className="space-y-4">
              {!confirmation ? (
                <>
                  <Field>
                    <FieldLabel htmlFor="recovery-password">Nova senha</FieldLabel>
                    <PasswordInput id="recovery-password" autoComplete="new-password" required
                      value={newPassword} disabled={busy || !validToken}
                      onChange={(event) => setNewPassword(event.target.value)} />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="recovery-confirm">Confirmar senha</FieldLabel>
                    <PasswordInput id="recovery-confirm" autoComplete="new-password" required
                      value={confirmPassword} disabled={busy || !validToken}
                      onChange={(event) => setConfirmPassword(event.target.value)} />
                  </Field>
                </>
              ) : null}
              <Button type="submit" variant="blue" className="w-full" disabled={busy || !validToken}>
                {busy ? 'Aguarde...' : content.action}
              </Button>
            </form>
          ) : null}
          <Link className="block text-center text-sm text-sidebar-primary underline underline-offset-4"
            to={confirmation && isAuthenticated ? '/perfil' : '/login'}>
            {confirmation && isAuthenticated ? 'Voltar ao perfil' : 'Voltar ao login'}
          </Link>
        </div>
      </main>
    </div>
  )
}
