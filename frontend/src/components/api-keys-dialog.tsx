import { useCallback, useEffect, useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CheckIcon, CopyIcon, KeyRoundIcon, Trash2Icon } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { copyToClipboard } from '@/lib/clipboard'
import { api } from '@/lib/api-handler'
import type {
  ApiKeySummary,
  ApiKeysListResponse,
  CreateApiKeyResponse,
} from '@/types/api-key'

export function ApiKeysDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [apiKeys, setApiKeys] = useState<ApiKeySummary[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [name, setName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [createdKey, setCreatedKey] = useState<string | null>(null)
  const [keyCopied, setKeyCopied] = useState(false)
  const [revokingId, setRevokingId] = useState<string | null>(null)
  const [revokeConfirmKey, setRevokeConfirmKey] = useState<ApiKeySummary | null>(
    null,
  )

  const loadKeys = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await api<ApiKeysListResponse>('/api-keys', {
        toastOnSuccess: false,
      })
      setApiKeys(data.apiKeys)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    void loadKeys()
  }, [open, loadKeys])

  const handleCreate = async () => {
    const trimmed = name.trim()
    if (!trimmed) {
      toast.error('Informe um nome para a chave.')
      return
    }

    setIsCreating(true)
    try {
      const data = await api<CreateApiKeyResponse>('/api-keys', {
        method: 'POST',
        body: JSON.stringify({ name: trimmed }),
      })
      setCreatedKey(data.apiKey.key)
      setName('')
      await loadKeys()
    } finally {
      setIsCreating(false)
    }
  }

  const handleRevoke = async (id: string) => {
    setRevokingId(id)
    try {
      await api(`/api-keys/${id}`, { method: 'DELETE' })
      setRevokeConfirmKey(null)
      await loadKeys()
    } finally {
      setRevokingId(null)
    }
  }

  const copyKey = async (value: string) => {
    try {
      await copyToClipboard(value)
      setKeyCopied(true)
      window.setTimeout(() => setKeyCopied(false), 2000)
      toast.success('Chave copiada.')
    } catch {
      toast.error('Não foi possível copiar a chave.')
    }
  }

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setRevokeConfirmKey(null)
          }
          onOpenChange(nextOpen)
        }}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Integrações</DialogTitle>
            <DialogDescription>
              Gere chaves pessoais para integrar o Kairo a outros sistemas. A
              chave completa só é exibida uma vez na criação.
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-end">
            <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
              <KeyRoundIcon className="size-4" />
              Nova chave
            </Button>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 2 }).map((_, index) => (
                <Skeleton key={index} className="h-16 rounded-xl" />
              ))}
            </div>
          ) : apiKeys.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma chave ativa. Crie uma para conectar aplicações externas.
            </p>
          ) : (
            <ul className="max-h-72 divide-y overflow-y-auto rounded-xl border">
              {apiKeys.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{item.name}</p>
                    <p className="text-muted-foreground font-mono text-xs">
                      {item.keyPrefix}…
                    </p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      Criada em{' '}
                      {format(
                        new Date(item.createdAt),
                        "dd/MM/yyyy 'às' HH:mm",
                        { locale: ptBR },
                      )}
                      {item.lastUsedAt
                        ? ` · Último uso ${format(
                            new Date(item.lastUsedAt),
                            "dd/MM/yyyy 'às' HH:mm",
                            { locale: ptBR },
                          )}`
                        : ' · Nunca usada'}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={revokingId === item.id}
                    onClick={() => setRevokeConfirmKey(item)}
                  >
                    <Trash2Icon className="size-3.5" />
                    Revogar
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={createOpen}
        onOpenChange={(nextOpen) => {
          setCreateOpen(nextOpen)
          if (!nextOpen) {
            setCreatedKey(null)
            setKeyCopied(false)
            setName('')
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {createdKey ? 'Chave criada' : 'Nova chave de API'}
            </DialogTitle>
            <DialogDescription>
              {createdKey
                ? 'Copie a chave agora. Ela não será exibida novamente.'
                : 'Escolha um nome para identificar onde a chave será usada.'}
            </DialogDescription>
          </DialogHeader>

          {createdKey ? (
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={createdKey}
                className="font-mono text-xs"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => void copyKey(createdKey)}
              >
                {keyCopied ? (
                  <CheckIcon className="size-4 text-green-600" />
                ) : (
                  <CopyIcon className="size-4" />
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="api-key-name">
                Nome
              </label>
              <Input
                id="api-key-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Ex.: solicitacao-eng-mecanica"
                maxLength={80}
              />
            </div>
          )}

          <DialogFooter>
            {createdKey ? (
              <Button type="button" onClick={() => setCreateOpen(false)}>
                Concluir
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCreateOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  disabled={isCreating}
                  onClick={() => void handleCreate()}
                >
                  Criar
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={revokeConfirmKey !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setRevokeConfirmKey(null)
          }
        }}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Revogar chave?</DialogTitle>
            <DialogDescription>
              {revokeConfirmKey ? (
                <>
                  Tem certeza que deseja revogar a chave{' '}
                  <span className="font-medium text-foreground">
                    {revokeConfirmKey.name}
                  </span>
                  ? Integrações que usam essa chave deixarão de funcionar.
                </>
              ) : (
                'Tem certeza que deseja revogar esta chave?'
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="cancel"
              disabled={revokingId !== null}
              onClick={() => setRevokeConfirmKey(null)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={!revokeConfirmKey || revokingId !== null}
              onClick={() =>
                revokeConfirmKey && void handleRevoke(revokeConfirmKey.id)
              }
            >
              {revokingId ? 'Revogando…' : 'Revogar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
