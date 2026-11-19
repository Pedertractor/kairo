import { AuthLayout } from '@/components/auth-layout';
import { ChangePasswordForm } from '@/components/change-password-form';

export function ChangePasswordPage() {
  return (
    <AuthLayout>
      <ChangePasswordForm />
    </AuthLayout>
  );
}
