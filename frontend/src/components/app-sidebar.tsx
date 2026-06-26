import type { ComponentProps } from 'react'

import { NavMain } from '@/components/nav-main'
import { NavProjects } from '@/components/nav-projects'
import { NavUser } from '@/components/nav-user'
import { TeamSwitcher } from '@/components/team-switcher'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar'
import { useAuth } from '@/hooks/use-auth'
import type { UnitType } from '@/types/auth'
import {
  BookOpenIcon,
  BotIcon,
  FrameIcon,
  GalleryVerticalEndIcon,
  HomeIcon,
  MapIcon,
  PieChartIcon,
  Settings2Icon,
  TerminalSquareIcon,
} from 'lucide-react'

const UNIT_LABELS: Record<UnitType, string> = {
  PEDERTRACTOR: 'Pedertractor',
  TRACTOR: 'Tractor',
}

const navMain = [
  {
    title: 'Início',
    url: '/',
    icon: <HomeIcon />,
    isActive: true,
    items: [
      { title: 'Painel', url: '/' },
      { title: 'Resumo', url: '#' },
    ],
  },
  {
    title: 'Operações',
    url: '#',
    icon: <TerminalSquareIcon />,
    items: [
      { title: 'Histórico', url: '#' },
      { title: 'Favoritos', url: '#' },
    ],
  },
  {
    title: 'Relatórios',
    url: '#',
    icon: <BotIcon />,
    items: [
      { title: 'Produção', url: '#' },
      { title: 'Desempenho', url: '#' },
    ],
  },
  {
    title: 'Documentação',
    url: '#',
    icon: <BookOpenIcon />,
    items: [
      { title: 'Introdução', url: '#' },
      { title: 'Guias', url: '#' },
    ],
  },
  {
    title: 'Configurações',
    url: '#',
    icon: <Settings2Icon />,
    items: [
      { title: 'Geral', url: '#' },
      { title: 'Equipa', url: '#' },
    ],
  },
]

const projects = [
  { name: 'Engenharia', url: '#', icon: <FrameIcon /> },
  { name: 'Vendas', url: '#', icon: <PieChartIcon /> },
  { name: 'Logística', url: '#', icon: <MapIcon /> },
]

export function AppSidebar({ ...props }: ComponentProps<typeof Sidebar>) {
  const { user } = useAuth()

  const teams = user
    ? [
        {
          name: 'Kairo',
          logo: <GalleryVerticalEndIcon />,
          plan: UNIT_LABELS[user.unit],
        },
      ]
    : []

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
        <NavProjects projects={projects} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
