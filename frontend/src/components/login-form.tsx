import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { PasswordInput } from '@/components/password-input';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';
import type { UnitType } from '@/types/auth';
import { api } from '@/lib/api-handler';
import { RECOVERY_MESSAGES, type RecoveryResponse } from '@/types/profile';
import { ArrowRightIcon, Building2Icon, CheckIcon, CreditCardIcon, KeyRoundIcon, LoaderCircleIcon } from 'lucide-react';

const UNITS: UnitType[] = ['PEDERTRACTOR', 'TRACTOR'];

export function LoginForm({
  className,
  production = false,
  ...props
}: Omit<React.ComponentProps<'form'>, 'onSubmit'> & { production?: boolean }) {
  const { login, loginProduction } = useAuth();
  const navigate = useNavigate();
  const [unit, setUnit] = useState<UnitType>('PEDERTRACTOR');
  const [cardNumber, setCardNumber] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryMessage, setRecoveryMessage] = useState('');

  async function recoverPassword() {
    if (!cardNumber.trim()) { setRecoveryMessage('Informe o número do cartão e selecione a unidade para recuperar sua senha.'); return; }
    setIsRecovering(true);
    setRecoveryMessage('');
    try {
      const response = await api<RecoveryResponse>('/auth/forgot-password', {
        method: 'POST', body: JSON.stringify({ cardNumber: cardNumber.trim(), unit }),
        toastOnError: false, toastOnSuccess: false,
      });
      setRecoveryMessage(RECOVERY_MESSAGES[response.status]);
    } catch (error) {
      setRecoveryMessage(error instanceof Error ? error.message : 'Não foi possível solicitar a recuperação. Tente novamente.');
    } finally { setIsRecovering(false); }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      if (production) {
        await loginProduction({ unit, cardNumber });
        navigate('/producao/atividades', { replace: true });
        return;
      }
      const loggedIn = await login({ unit, cardNumber, password });
      if (loggedIn) {
        navigate('/');
      }
    } catch {
      // API errors are displayed by the shared client.
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      className={cn('flex flex-col gap-6', className)}
      onSubmit={handleSubmit}
      {...props}
    >
      <FieldGroup className='gap-6'>
        <div className='mb-2 space-y-3'>
          <p className='text-xs font-semibold tracking-[0.16em] text-blue-700 uppercase dark:text-blue-400'>
            {production ? 'Portal da produção' : 'Bem-vindo ao Kairo'}
          </p>
          <h1 className='text-3xl leading-tight font-semibold tracking-tight sm:text-[34px]'>{production ? 'Acesso da produção' : 'Acesse sua conta'}</h1>
          <p className='text-sm leading-relaxed text-muted-foreground'>
            {production ? 'Selecione sua unidade e informe o cartão para começar.' : 'Entre para acompanhar suas atividades e continuar de onde parou.'}
          </p>
        </div>
        <fieldset className='space-y-2.5'>
          <legend className='mb-2.5 text-sm font-medium'>Sua unidade</legend>
          <div className='grid grid-cols-2 gap-3'>
            {UNITS.map((option) => (
              <Button
                key={option}
                type='button'
                variant='outline'
                aria-pressed={unit === option}
                className={cn('h-12 justify-start gap-2 rounded-xl px-3 text-xs transition-colors sm:px-4',
                  unit === option
                    ? 'border-blue-600 bg-blue-50 text-blue-800 ring-1 ring-blue-600/10 hover:bg-blue-100 dark:border-blue-400 dark:bg-blue-500/15 dark:text-blue-200'
                    : 'border-border bg-background text-muted-foreground hover:border-blue-300 hover:bg-muted/40')}
                onClick={() => { setUnit(option); setRecoveryMessage(''); }}
                disabled={isSubmitting || isRecovering}
              >
                <Building2Icon className='size-4 shrink-0' aria-hidden='true' />
                {option}
                {unit === option ? <CheckIcon className='ml-auto size-3.5 shrink-0' aria-hidden='true' /> : null}
              </Button>
            ))}
          </div>
        </fieldset>
        <Field>
          <FieldLabel htmlFor='cardNumber'>Número do cartão</FieldLabel>
          <div className='relative'>
          <CreditCardIcon className='pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground' aria-hidden='true' />
          <Input
            id='cardNumber'
            name='cardNumber'
            autoComplete='username'
            placeholder='Digite o número do seu cartão'
            className='h-12 rounded-xl bg-background pl-10 text-sm shadow-xs transition-shadow focus-visible:border-blue-500 focus-visible:ring-blue-500/15'
            value={cardNumber}
            onChange={(event) => { setCardNumber(event.target.value); setRecoveryMessage(''); }}
            disabled={isSubmitting || isRecovering}
            required
          />
          </div>
        </Field>
        {!production ? <Field>
          <FieldLabel htmlFor='password'>Senha</FieldLabel>
          <PasswordInput
            id='password'
            name='password'
            autoComplete='current-password'
            placeholder='Digite sua senha'
            className='h-12 rounded-xl bg-background shadow-xs [&:focus-within]:border-blue-500 [&:focus-within]:ring-blue-500/15'
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={isSubmitting || isRecovering}
            required
          />
        </Field> : null}
        <div className='space-y-3'>
          <Button type='submit' variant='blue' className='h-12 w-full rounded-xl bg-blue-700 text-sm font-semibold text-white shadow-sm shadow-blue-700/15 transition-all hover:bg-blue-800 hover:shadow-md' disabled={isSubmitting || isRecovering}>
            {isSubmitting ? <LoaderCircleIcon className='size-4 animate-spin' aria-hidden='true' /> : null}
            {isSubmitting ? 'Entrando...' : 'Entrar'}
            {!isSubmitting ? <ArrowRightIcon className='ml-1 size-4' aria-hidden='true' /> : null}
          </Button>
          {!production ? <Button type='button' variant='ghost' className='h-11 w-full gap-2 rounded-xl border border-blue-100 bg-blue-50/60 text-sm font-medium text-blue-700 hover:border-blue-200 hover:bg-blue-100/70 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300 dark:hover:bg-blue-500/20' disabled={isSubmitting || isRecovering} onClick={() => void recoverPassword()}>
            {isRecovering ? <LoaderCircleIcon className='size-4 animate-spin' aria-hidden='true' /> : <KeyRoundIcon className='size-4' aria-hidden='true' />}
            {isRecovering ? 'Enviando instruções...' : 'Esqueci minha senha'}
          </Button> : null}
        </div>
        {recoveryMessage ? <output className='block rounded-xl border border-blue-200/70 bg-blue-50/60 p-4 text-sm leading-relaxed text-blue-900 dark:border-blue-500/25 dark:bg-blue-500/10 dark:text-blue-200'>{recoveryMessage}</output> : null}
        <p className='border-t border-border/70 pt-5 text-center text-sm text-muted-foreground'>
          <Link
            to={production ? '/login' : '/producao'}
            className='rounded-sm transition-colors hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 dark:hover:text-blue-300'
          >
            {production ? 'Fazer acesso padrão' : 'Fazer acesso como produção'}
          </Link>
        </p>
      </FieldGroup>
    </form>
  );
}
