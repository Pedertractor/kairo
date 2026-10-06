import { Link } from 'react-router-dom'

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'

export function NavMain({
  items,
}: {
  items: {
    title: string
    url: string
    icon?: React.ReactNode
    isActive?: boolean
    badge?: number
  }[]
}) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>Plataforma</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => {
          const showBadge = typeof item.badge === 'number' && item.badge > 0
          const badgeLabel =
            item.badge === 1
              ? '1 nova ausência'
              : `${item.badge} novas ausências`

          return (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                tooltip={item.title}
                isActive={item.isActive}
                render={<Link to={item.url} />}
              >
                {item.icon ? (
                  <span className='relative'>
                    {item.icon}
                    {showBadge ? (
                      <span
                        aria-hidden
                        className='absolute -top-0.5 -right-0.5 hidden size-2 rounded-full bg-destructive group-data-[collapsible=icon]:block'
                      />
                    ) : null}
                  </span>
                ) : null}
                <span>{item.title}</span>
              </SidebarMenuButton>
              {showBadge ? (
                <SidebarMenuBadge
                  aria-label={badgeLabel}
                  className='rounded-full bg-destructive text-white peer-hover/menu-button:text-white peer-data-active/menu-button:text-white'
                >
                  {item.badge! > 99 ? '99+' : item.badge}
                </SidebarMenuBadge>
              ) : null}
            </SidebarMenuItem>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}
