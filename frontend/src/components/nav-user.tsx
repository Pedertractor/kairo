import {
  Avatar,
  AvatarFallback,
} from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { InstallAppDialog } from '@/components/install-app-dialog'
import { useAuth } from '@/hooks/use-auth'
import { usePwaInstall } from '@/hooks/use-pwa-install'
import { getInitials } from '@/lib/initials'
import { ChevronsUpDownIcon, LogOutIcon, SmartphoneIcon } from 'lucide-react'

export function NavUser() {
  const { user, logout } = useAuth()
  const { isMobile } = useSidebar()
  const {
    canInstall,
    isIos,
    promptInstall,
    instructionsOpen,
    setInstructionsOpen,
  } = usePwaInstall()

  if (!user) {
    return null
  }

  const initials = getInitials(user.name)

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton size="lg" className="aria-expanded:bg-muted" />
            }
          >
            <Avatar>
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{user.name}</span>
              <span className="truncate text-xs">{user.employeeId}</span>
            </div>
            <ChevronsUpDownIcon className="ml-auto size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-fit min-w-52"
            side={isMobile ? 'bottom' : 'right'}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar>
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{user.name}</span>
                    <span className="truncate text-xs">{user.employeeId}</span>
                  </div>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <div className="flex items-stretch gap-1">
              {canInstall ? (
                <DropdownMenuItem
                  className="min-w-0 flex-1 justify-center"
                  onClick={() => void promptInstall()}
                >
                  <SmartphoneIcon />
                  Instalar
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem
                className={canInstall ? 'min-w-0 flex-1 justify-center' : undefined}
                onClick={() => void logout()}
              >
                <LogOutIcon />
                Sair
              </DropdownMenuItem>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
        <InstallAppDialog
          open={instructionsOpen}
          onOpenChange={setInstructionsOpen}
          isIos={isIos}
        />
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
