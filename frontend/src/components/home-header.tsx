import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { getFirstName, getGreeting } from '@/lib/greeting';
import { getInitials } from '@/lib/initials';
import { useAuth } from '@/hooks/use-auth';

export function HomeHeader() {
  const { user } = useAuth();
  const greeting = getGreeting();
  const firstName = user?.name ? getFirstName(user.name) : '';
  const initials = user ? getInitials(user.name) : '';

  return (
    <div className='flex items-center justify-between gap-4'>
      <h1 className='text-lg font-semibold tracking-tight sm:text-xl'>
        {greeting}
        {firstName ? `, ${firstName}` : ''}
      </h1>

      <div className='flex items-center gap-2 sm:gap-3'>
        <Avatar size='sm' className='size-9'>
          <AvatarFallback className='bg-sidebar-primary/10 text-xs font-medium text-sidebar-primary'>
            {initials}
          </AvatarFallback>
        </Avatar>
      </div>
    </div>
  );
}
