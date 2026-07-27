import { useState } from 'react';
import { Settings } from 'lucide-react';

import { PaletteDialog } from '@/components/palette-dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useAuth } from '@/hooks/use-auth';
import { useIsMobile } from '@/hooks/use-mobile';
import { getFirstName, getGreeting } from '@/lib/greeting';
import { getInitials } from '@/lib/initials';

export function HomeDashboardHeader() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const greeting = getGreeting();
  const firstName = user?.name ? getFirstName(user.name) : '';
  const initials = user?.name ? getInitials(user.name) : '?';

  return (
    <>
      <div className='flex items-center justify-between gap-4'>
        <div className='flex min-w-0 items-center gap-2'>
          {isMobile ? <SidebarTrigger className='-ml-1 shrink-0' /> : null}
          <h1 className='truncate text-sm font-semibold tracking-tight text-foreground sm:text-base'>
            {greeting}
            {firstName ? `, ${firstName}` : ''}
          </h1>
        </div>

        <div className='flex items-center gap-2 sm:gap-3'>
          <button
            type='button'
            className='flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground'
            aria-label='Configurações'
            onClick={() => setSettingsOpen(true)}
          >
            <Settings className='size-5' />
          </button>

          <Avatar size='sm' className='size-9'>
            <AvatarFallback className='bg-sidebar-primary/10 text-xs font-medium text-sidebar-primary'>
              {initials}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>

      <PaletteDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  );
}
