import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ShareIcon, SquarePlusIcon, EllipsisVerticalIcon } from 'lucide-react'

interface InstallAppDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  isIos: boolean
}

export function InstallAppDialog({
  open,
  onOpenChange,
  isIos,
}: InstallAppDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Instalar o Kairo</DialogTitle>
          <DialogDescription>
            Adicione o atalho à tela inicial para abrir o app como no celular.
          </DialogDescription>
        </DialogHeader>

        {isIos ? (
          <ol className="grid gap-3 text-sm">
            <li className="flex items-start gap-3">
              <ShareIcon className="mt-0.5 size-4 shrink-0 text-sidebar-primary" />
              <span>
                Toque em <strong>Compartilhar</strong> na barra do Safari.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <SquarePlusIcon className="mt-0.5 size-4 shrink-0 text-sidebar-primary" />
              <span>
                Escolha <strong>Adicionar à Tela de Início</strong>.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center text-xs font-semibold text-sidebar-primary">
                3
              </span>
              <span>
                Confirme em <strong>Adicionar</strong>.
              </span>
            </li>
          </ol>
        ) : (
          <ol className="grid gap-3 text-sm">
            <li className="flex items-start gap-3">
              <EllipsisVerticalIcon className="mt-0.5 size-4 shrink-0 text-sidebar-primary" />
              <span>
                Abra o menu do navegador (três pontos).
              </span>
            </li>
            <li className="flex items-start gap-3">
              <SquarePlusIcon className="mt-0.5 size-4 shrink-0 text-sidebar-primary" />
              <span>
                Toque em <strong>Instalar app</strong> ou{' '}
                <strong>Adicionar à tela inicial</strong>.
              </span>
            </li>
          </ol>
        )}
      </DialogContent>
    </Dialog>
  )
}
