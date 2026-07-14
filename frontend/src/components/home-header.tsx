import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { getFirstName, getGreeting } from '@/lib/greeting';
import { getInitials } from '@/lib/initials';
import { useAuth } from '@/hooks/use-auth';
import { Bell, CalendarDays } from 'lucide-react';

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
        <button
          type='button'
          className='flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground'
          aria-label='Calendário'
        >
          <CalendarDays className='size-5' />
        </button>
        <button
          type='button'
          className='relative flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground'
          aria-label='Notificações'
        >
          <Bell className='size-5' />
          <span className='absolute right-2 top-2 size-2 rounded-full bg-destructive' />
        </button>
        <Avatar size='sm' className='size-9'>
          <AvatarFallback className='bg-sidebar-primary/10 text-xs font-medium text-sidebar-primary'>
            {initials}
          </AvatarFallback>
        </Avatar>
      </div>
    </div>
  );
}
