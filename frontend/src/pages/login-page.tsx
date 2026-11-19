import { AuthLayout } from '@/components/auth-layout';
import { LoginForm } from '@/components/login-form';

export function LoginPage({ production = false }: { production?: boolean }) {
  return (
    <AuthLayout>
      <LoginForm production={production} />
    </AuthLayout>
  );
}
