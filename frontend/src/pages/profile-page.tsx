import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { CheckCircle2Icon, MailIcon, UserRoundIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useAuth } from '@/hooks/use-auth'
import { api, ApiError } from '@/lib/api-handler'
import type { ContactProfile, ProfileResponse } from '@/types/profile'

export function ProfilePage() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<ContactProfile | null>(null)
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [removeOpen, setRemoveOpen] = useState(false)
  const [sendFailed, setSendFailed] = useState(false)

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true)
    setError('')
    try {
      const { profile: contact } = await api<ProfileResponse>('/auth/me/profile', { toastOnError: false, signal })
      if (signal?.aborted) return
      setProfile(contact)
      setEmail(contact.pendingEmail ?? contact.email ?? '')
    } catch {
      if (!signal?.aborted) setError('Não foi possível carregar o perfil. Tente novamente.')
    } finally { if (!signal?.aborted) setLoading(false) }
  }, [])
  useEffect(() => {
    const controller = new AbortController()
    void load(controller.signal)
    return () => controller.abort()
  }, [load])

  async function save(value: string | null) {
    setSaving(true)
    setSendFailed(false)
    try {
      const { profile: contact } = await api<ProfileResponse>('/auth/me/profile', {
        method: 'PATCH', body: JSON.stringify({ email: value }),
      })
      setProfile(contact)
      setEmail(contact.pendingEmail ?? contact.email ?? '')
      setRemoveOpen(false)
    } catch (failure) {
      if (value !== null && failure instanceof ApiError && (failure.status === 0 || failure.status >= 500)) setSendFailed(true)
      // A failed SMTP delivery can leave the new address pending for a resend.
      try {
        const { profile: contact } = await api<ProfileResponse>('/auth/me/profile', { toastOnError: false })
        setProfile(contact)
      } catch { /* Preserve the form when the server is unavailable. */ }
    } finally { setSaving(false) }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const normalized = email.trim().toLowerCase()
    if (!normalized && (profile?.email || profile?.pendingEmail)) { setRemoveOpen(true); return }
    await save(normalized || null)
  }

  async function resend() {
    setSaving(true)
    try {
      await api('/auth/me/profile/resend-email-verification', { method: 'POST' })
      setSendFailed(false)
    } catch (failure) {
      if (failure instanceof ApiError && (failure.status === 0 || failure.status >= 500)) setSendFailed(true)
    }
    finally { setSaving(false) }
  }

  if (loading) return <output className="text-sm text-muted-foreground">Carregando perfil...</output>
  if (error) return <div className="space-y-3"><p role="alert">{error}</p><Button onClick={() => void load()}>Tentar novamente</Button></div>
  const changed = email.trim().toLowerCase() !== (profile?.pendingEmail ?? profile?.email ?? '')

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex size-12 items-center justify-center rounded-xl bg-brand-soft text-sidebar-primary">
          <UserRoundIcon className="size-6" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Meu perfil</h1>
          <p className="text-sm text-muted-foreground">Seus dados e seu e-mail de recuperação.</p>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Dados do colaborador</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">Nome</dt>
              <dd className="mt-1 font-medium">{user?.name}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Cartão</dt>
              <dd className="mt-1 font-medium">{user?.cardNumber}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Unidade</dt>
              <dd className="mt-1 font-medium">{user?.unit === 'PEDERTRACTOR' ? 'Pedertractor' : 'Tractor'}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MailIcon className="size-4" />E-mail de recuperação
          </CardTitle>
          <CardDescription>Cadastre um endereço ao qual você tenha acesso. Você receberá um link para confirmá-lo.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {profile?.email && profile.verifiedAt ? (
            <div className="flex items-start gap-2 rounded-lg border bg-muted/40 p-3 text-sm">
              <CheckCircle2Icon className="mt-0.5 size-4 shrink-0 text-emerald-600" />
              <div>
                <p className="font-medium">E-mail confirmado</p>
                <p className="break-all text-muted-foreground">{profile.email}</p>
              </div>
            </div>
          ) : null}
          {profile?.pendingEmail ? (
            <section aria-label="Confirmação pendente" aria-live="polite" className="space-y-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm">
              <p className="font-medium">Confirmação pendente</p>
              {sendFailed ? <p role="alert" className="text-destructive">Não foi possível enviar o link. Tente reenviar a confirmação.</p> : null}
              <p className="break-words text-muted-foreground">
                Endereço a confirmar: <span className="break-all font-medium text-foreground">{profile.pendingEmail}</span>.
              </p>
              <p className="text-muted-foreground">
                {profile.email
                  ? 'Até a confirmação, a recuperação continua usando o endereço confirmado acima.'
                  : 'A recuperação de senha estará disponível depois da confirmação.'}
              </p>
              {!sendFailed ? <p className="text-muted-foreground">Verifique sua caixa de entrada e abra o link de confirmação.</p> : null}
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                <Button type="button" variant="link" className="h-auto p-0" disabled={saving} onClick={() => void resend()}>
                  Reenviar confirmação
                </Button>
                <Button type="button" variant="link" className="h-auto p-0" disabled={saving} onClick={() => void load()}>
                  Já confirmei
                </Button>
              </div>
            </section>
          ) : null}
          <form onSubmit={(event) => void submit(event)} className="space-y-4">
            <Field>
              <FieldLabel htmlFor="profile-email">E-mail (opcional)</FieldLabel>
              <Input id="profile-email" name="email" type="email" autoComplete="email" maxLength={254}
                placeholder="seu.email@exemplo.com" value={email} disabled={saving}
                onChange={(event) => setEmail(event.target.value)} />
              <p className="text-xs text-muted-foreground">O endereço é opcional. Sem ele, a redefinição de senha depende da equipe de automação.</p>
            </Field>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" variant="blue" disabled={saving || !changed}>{saving ? 'Aguarde...' : 'Salvar e-mail'}</Button>
              {profile?.email || profile?.pendingEmail ? (
                <Button type="button" variant="destructive" disabled={saving} onClick={() => setRemoveOpen(true)}>
                  Remover e-mail
                </Button>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>
      <Dialog open={removeOpen} onOpenChange={(open) => { if (!saving) setRemoveOpen(open) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover e-mail?</DialogTitle>
            <DialogDescription>Os endereços confirmado e pendente serão removidos. Sem um e-mail, você precisará contatar a equipe de automação para recuperar sua senha.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" disabled={saving} />}>Cancelar</DialogClose>
            <Button variant="destructive" disabled={saving} onClick={() => void save(null)}>
              {saving ? 'Removendo...' : 'Confirmar remoção'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
