import type { ComponentProps } from 'react';
import { useLocation } from 'react-router-dom';

import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { SidebarBrand } from '@/components/sidebar-brand';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar';
import { useAuth } from '@/hooks/use-auth';
import type { UnitType } from '@/types/auth';
import {
  ChartNoAxesCombinedIcon,
  BoxIcon,
  ClockIcon,
  FolderKanbanIcon,
  HomeIcon,
  UserCogIcon,
  UsersIcon,
} from 'lucide-react';

const UNIT_LABELS: Record<UnitType, string> = {
  PEDERTRACTOR: 'Pedertractor',
  TRACTOR: 'Tractor',
};

const baseNavItems = [
  {
    title: 'Início',
    url: '/',
    icon: <HomeIcon />,
  },
  {
    title: 'Equipes',
    url: '/equipes',
    icon: <UsersIcon />,
  },
  {
    title: 'Projetos',
    url: '/projetos',
    icon: <FolderKanbanIcon />,
  },
  {
    title: 'Apontamentos',
    url: '/apontamentos',
    icon: <ClockIcon />,
  },
];

const printerOperatorNavItems = [
  {
    title: '3D',
    url: '/3d',
    icon: <BoxIcon />,
  },
];

const teamOwnerNavItems = [
  {
    title: 'Analytics',
    url: '/analytics',
    icon: <ChartNoAxesCombinedIcon />,
  },
];

const adminNavItems = [
  {
    title: 'Usuários',
    url: '/usuarios',
    icon: <UserCogIcon />,
  },
];

export function AppSidebar({ ...props }: ComponentProps<typeof Sidebar>) {
  const { user } = useAuth();
  const { pathname } = useLocation();

  const navItems = [
    ...baseNavItems,
    ...(user?.hasOwnedTeams ? teamOwnerNavItems : []),
    ...(user?.printerOperator ? printerOperatorNavItems : []),
    ...(user?.role === 'ADMIN' || user?.role === 'LEADER'
      ? adminNavItems
      : []),
  ];

  const navMain = navItems.map((item) => ({
    ...item,
    isActive:
      item.url === '/'
        ? pathname === '/'
        : pathname === item.url || pathname.startsWith(`${item.url}/`),
  }));

  return (
    <Sidebar collapsible='icon' {...props}>
      <SidebarHeader>
        {user ? (
          <SidebarBrand name='kairo' subtitle={UNIT_LABELS[user.unit]} />
        ) : null}
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
