import type { ReactNode } from 'react'

import { ActiveTimerBar } from '@/components/active-timer-bar'
import { AppSidebar } from '@/components/app-sidebar'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb'
import { Separator } from '@/components/ui/separator'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { ActiveTimerProvider } from '@/contexts/active-timer-context'
import { useActiveTimer } from '@/hooks/use-active-timer'
import { cn } from '@/lib/utils'

interface AppLayoutProps {
  children: ReactNode
  title?: string
  hideHeader?: boolean
  mainClassName?: string
}

function AppLayoutContent({
  children,
  title = 'Início',
  hideHeader = false,
  mainClassName,
}: AppLayoutProps) {
  const { hasTimerBar } = useActiveTimer()

  return (
    <>
      <AppSidebar />
      <SidebarInset className="min-h-svh">
        {hideHeader ? null : (
          <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
            <div className="flex items-center gap-2 px-6 lg:px-10">
              <SidebarTrigger className="-ml-1" />
              <Separator
                orientation="vertical"
                className="mr-2 data-[orientation=vertical]:h-4"
              />
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbPage>{title}</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </header>
        )}
        <main
          className={cn(
            'flex flex-1 flex-col px-6 pb-6 lg:px-10',
            hideHeader && 'pt-6',
            hasTimerBar && 'pb-20',
            mainClassName,
          )}
        >
          {children}
        </main>
        <ActiveTimerBar />
      </SidebarInset>
    </>
  )
}

export function AppLayout({
  children,
  title = 'Início',
  hideHeader = false,
  mainClassName,
}: AppLayoutProps) {
  return (
    <SidebarProvider>
      <ActiveTimerProvider>
        <AppLayoutContent
          title={title}
          hideHeader={hideHeader}
          mainClassName={mainClassName}
        >
          {children}
        </AppLayoutContent>
      </ActiveTimerProvider>
    </SidebarProvider>
  )
}
