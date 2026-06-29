import * as React from 'react'

import { cn } from '@/lib/utils'

interface TabsContextValue {
  value: string
  onValueChange: (value: string) => void
}

const TabsContext = React.createContext<TabsContextValue | null>(null)

function useTabsContext() {
  const context = React.useContext(TabsContext)

  if (!context) {
    throw new Error('Tabs components must be used within Tabs')
  }

  return context
}

function Tabs({
  value,
  onValueChange,
  className,
  children,
}: {
  value: string
  onValueChange: (value: string) => void
  className?: string
  children: React.ReactNode
}) {
  return (
    <TabsContext.Provider value={{ value, onValueChange }}>
      <div data-slot="tabs" className={cn('flex flex-col gap-4', className)}>
        {children}
      </div>
    </TabsContext.Provider>
  )
}

function TabsList({
  className,
  children,
}: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="tabs-list"
      role="tablist"
      className={cn('flex gap-6 border-b', className)}
    >
      {children}
    </div>
  )
}

function TabsTrigger({
  value,
  className,
  children,
}: {
  value: string
  className?: string
  children: React.ReactNode
}) {
  const { value: activeValue, onValueChange } = useTabsContext()
  const isActive = activeValue === value

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      data-slot="tabs-trigger"
      data-state={isActive ? 'active' : 'inactive'}
      className={cn(
        '-mb-px border-b-2 px-1 pb-3 text-sm font-medium transition-colors',
        isActive
          ? 'border-primary text-foreground'
          : 'border-transparent text-muted-foreground hover:text-foreground',
        className,
      )}
      onClick={() => onValueChange(value)}
    >
      {children}
    </button>
  )
}

function TabsContent({
  value,
  className,
  children,
}: {
  value: string
  className?: string
  children: React.ReactNode
}) {
  const { value: activeValue } = useTabsContext()

  if (activeValue !== value) {
    return null
  }

  return (
    <div
      data-slot="tabs-content"
      role="tabpanel"
      className={cn('flex flex-1 flex-col', className)}
    >
      {children}
    </div>
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
