import { useState } from 'react'

import { PrintingMachinesSection } from '@/components/printing-machines-section'
import { ThreeDPartsSection } from '@/components/three-d-parts-section'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

type ThreeDTab = 'impressoras' | 'pecas'

export function ThreeDPage() {
  const [activeTab, setActiveTab] = useState<ThreeDTab>('impressoras')

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Impressão 3D</h1>
        <p className="text-sm text-muted-foreground">
          Gerencie impressoras e peças para produção 3D.
        </p>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as ThreeDTab)}
        className="min-w-0 flex-1"
      >
        <TabsList className="border-sidebar-border">
          <TabsTrigger
            value="impressoras"
            className="data-[state=active]:border-sidebar-primary data-[state=active]:text-sidebar-primary"
          >
            Impressoras
          </TabsTrigger>
          <TabsTrigger
            value="pecas"
            className="data-[state=active]:border-sidebar-primary data-[state=active]:text-sidebar-primary"
          >
            Peças 3D
          </TabsTrigger>
        </TabsList>

        <TabsContent value="impressoras">
          <PrintingMachinesSection />
        </TabsContent>
        <TabsContent value="pecas">
          <ThreeDPartsSection />
        </TabsContent>
      </Tabs>
    </div>
  )
}
