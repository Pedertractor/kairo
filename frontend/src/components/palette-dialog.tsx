import { CheckIcon } from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useTheme, type Palette } from '@/hooks/use-theme'
import { cn } from '@/lib/utils'

const PALETTE_OPTIONS: {
  id: Palette
  label: string
  description: string
  swatches: [string, string, string]
}[] = [
  {
    id: 'white',
    label: 'Claro',
    description: 'Fundo branco e tons neutros',
    swatches: ['#ffffff', '#e5e5e5', '#262626'],
  },
  {
    id: 'black',
    label: 'Escuro',
    description: 'Fundo preto e contraste alto',
    swatches: ['#171717', '#404040', '#f5f5f5'],
  },
  {
    id: 'colorful',
    label: 'Colorido',
    description: 'Verde, azul, teal e âmbar em harmonia',
    swatches: ['#15803D', '#2B8AEE', '#E8B84A'],
  },
]

interface PaletteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PaletteDialog({ open, onOpenChange }: PaletteDialogProps) {
  const { palette, setPalette } = useTheme()

  function handleSelect(next: Palette) {
    setPalette(next)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-md'>
        <DialogHeader>
          <DialogTitle>Paleta de cores</DialogTitle>
          <DialogDescription>
            Escolha a aparência da interface. A preferência é salva neste
            dispositivo.
          </DialogDescription>
        </DialogHeader>

        <div className='grid gap-2'>
          {PALETTE_OPTIONS.map((option) => {
            const selected = palette === option.id
            return (
              <button
                key={option.id}
                type='button'
                onClick={() => handleSelect(option.id)}
                className={cn(
                  'flex items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors',
                  selected
                    ? 'border-sidebar-primary bg-sidebar-primary/5 ring-1 ring-sidebar-primary/30'
                    : 'border-border hover:bg-muted/60',
                )}
              >
                <div className='flex shrink-0 overflow-hidden rounded-lg border border-border'>
                  {option.swatches.map((color) => (
                    <span
                      key={color}
                      className='size-8'
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>

                <div className='min-w-0 flex-1'>
                  <p className='text-sm font-medium text-foreground'>
                    {option.label}
                  </p>
                  <p className='text-xs text-muted-foreground'>
                    {option.description}
                  </p>
                </div>

                {selected ? (
                  <CheckIcon className='size-4 shrink-0 text-sidebar-primary' />
                ) : null}
              </button>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}
