import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowRightIcon, LoaderCircleIcon, ShieldCheckIcon } from 'lucide-react'

import { AUTH_INPUT_CLASS, AUTH_SUBMIT_CLASS, AuthHeading } from '@/components/auth-heading'
import { Button } from '@/components/ui/button'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { PasswordInput } from '@/components/password-input'
import { useAuth } from '@/hooks/use-auth'
import { cn } from '@/lib/utils'

const INPUT_CLASS = `${AUTH_INPUT_CLASS} [&:focus-within]:border-blue-500 [&:focus-within]:ring-blue-500/15`

export function ChangePasswordForm({
  className,
  ...props
}: Omit<React.ComponentProps<'form'>, 'onSubmit'>) {
  const { changePassword, pendingUser } = useAuth()
  const navigate = useNavigate()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (newPassword !== confirmPassword) {
      toast.error('As senhas não coincidem')
      return
    }

    setIsSubmitting(true)

    try {
      await changePassword({ newPassword, confirmPassword })
      navigate('/')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className={cn('flex flex-col', className)} onSubmit={handleSubmit} {...props}>
      <FieldGroup className="gap-5 [@media(max-height:760px)]:gap-4">
        <AuthHeading
          eyebrow="Primeiro acesso"
          title="Defina sua nova senha"
          description={pendingUser
            ? `Olá, ${pendingUser.name}. Crie uma senha pessoal para continuar.`
            : 'Crie uma senha pessoal para continuar.'}
        />
        <Field>
          <FieldLabel htmlFor="newPassword">Nova senha</FieldLabel>
          <PasswordInput
            id="newPassword"
            name="newPassword"
            autoComplete="new-password"
            placeholder="Digite a nova senha"
            className={INPUT_CLASS}
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            disabled={isSubmitting}
            required
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="confirmPassword">Confirmar senha</FieldLabel>
          <PasswordInput
            id="confirmPassword"
            name="confirmPassword"
            autoComplete="new-password"
            placeholder="Repita a nova senha"
            className={INPUT_CLASS}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            disabled={isSubmitting}
            required
          />
        </Field>
        <Button type="submit" variant="blue" className={AUTH_SUBMIT_CLASS} disabled={isSubmitting}>
          {isSubmitting ? <LoaderCircleIcon className="size-4 animate-spin" aria-hidden="true" /> : null}
          {isSubmitting ? 'Salvando...' : 'Salvar senha'}
          {!isSubmitting ? <ArrowRightIcon className="ml-1 size-4" aria-hidden="true" /> : null}
        </Button>
        <p className="flex items-start gap-2 border-t border-border/70 pt-4 text-sm leading-relaxed text-muted-foreground [@media(max-height:760px)]:pt-3">
          <ShieldCheckIcon className="mt-0.5 size-4 shrink-0 text-blue-700 dark:text-blue-400" aria-hidden="true" />
          Use uma senha que só você conheça. Ela substituirá a senha provisória.
        </p>
      </FieldGroup>
    </form>
  )
}
