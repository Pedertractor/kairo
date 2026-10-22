import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { PasswordInput } from '@/components/password-input';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';
import type { UnitType } from '@/types/auth';

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
      <FieldGroup>
        <div className='flex flex-col items-center gap-1 text-center'>
          <h1 className='text-2xl font-bold'>{production ? 'Acesso da produção' : 'Entrar na sua conta'}</h1>
          <p className='text-sm text-balance text-muted-foreground'>
            {production ? 'Selecione a unidade e informe seu cartão' : 'Selecione a unidade e informe seu cartão e senha'}
          </p>
        </div>
        <Field>
          <FieldLabel htmlFor='cardNumber'>Número do cartão</FieldLabel>
          <Input
            id='cardNumber'
            name='cardNumber'
            autoComplete='username'
            placeholder='12345'
            value={cardNumber}
            onChange={(event) => setCardNumber(event.target.value)}
            required
          />
        </Field>
        {!production ? <Field>
          <FieldLabel htmlFor='password'>Senha</FieldLabel>
          <PasswordInput
            id='password'
            name='password'
            autoComplete='current-password'
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </Field> : null}
        <Field>
          <FieldLabel>Unidade</FieldLabel>
          <div className='grid grid-cols-2 gap-2'>
            {UNITS.map((option) => (
              <Button
                key={option}
                type='button'
                variant={unit === option ? 'blue' : 'outline'}
                onClick={() => setUnit(option)}
              >
                {option}
              </Button>
            ))}
          </div>
        </Field>
        <Field>
          <Button type='submit' variant='blue' disabled={isSubmitting}>
            {isSubmitting ? 'Entrando...' : 'Entrar'}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
}
