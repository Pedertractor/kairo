import type { ComponentProps } from 'react'

import { NavMain } from '@/components/nav-main'
import { NavUser } from '@/components/nav-user'
import { SidebarBrand } from '@/components/sidebar-brand'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar'
import { useAuth } from '@/hooks/use-auth'
import type { UnitType } from '@/types/auth'
import { HomeIcon } from 'lucide-react'

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
  },
]

export function AppSidebar({ ...props }: ComponentProps<typeof Sidebar>) {
  const { user } = useAuth()

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        {user ? (
          <SidebarBrand name="Kairo" subtitle={UNIT_LABELS[user.unit]} />
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
  )
}
