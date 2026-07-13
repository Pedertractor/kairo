import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';
import type { UnitType } from '@/types/auth';

const UNITS: UnitType[] = ['PEDERTRACTOR', 'TRACTOR'];

export function LoginForm({
  className,
  ...props
}: Omit<React.ComponentProps<'form'>, 'onSubmit'>) {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [unit, setUnit] = useState<UnitType>('PEDERTRACTOR');
  const [cardNumber, setCardNumber] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const loggedIn = await login({ unit, cardNumber, password });
      if (loggedIn) {
        navigate('/');
      }
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
          <h1 className='text-2xl font-bold'>Entrar na sua conta</h1>
          <p className='text-sm text-balance text-muted-foreground'>
            Selecione a unidade e informe seu cartão e senha
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
        <Field>
          <FieldLabel htmlFor='password'>Senha</FieldLabel>
          <Input
            id='password'
            name='password'
            type='password'
            autoComplete='current-password'
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </Field>
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
