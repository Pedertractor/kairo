import { useEffect, useState } from 'react'
import { FileText } from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { apiBlob } from '@/lib/api-handler'
import type { DocumentSummary } from '@/types/document'

interface DocumentPreviewDialogProps {
  teamId: string
  document: DocumentSummary | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

function isImageMimeType(mimeType: string) {
  return mimeType.startsWith('image/')
}

export function DocumentPreviewDialog({
  teamId,
  document,
  open,
  onOpenChange,
}: DocumentPreviewDialogProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    if (!open || !document) {
      setBlobUrl(null)
      setHasError(false)
      setIsLoading(false)
      return
    }

    let cancelled = false
    let objectUrl: string | null = null

    async function loadPreview() {
      if (!document) {
        return
      }

      setIsLoading(true)
      setHasError(false)

      try {
        const blob = await apiBlob(
          `/teams/${teamId}/documents/${document.id}/file`,
          { toastOnError: false },
        )

        if (cancelled) {
          return
        }

        objectUrl = URL.createObjectURL(blob)

        if (cancelled) {
          URL.revokeObjectURL(objectUrl)
          return
        }

        setBlobUrl(objectUrl)
      } catch {
        if (!cancelled) {
          setHasError(true)
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadPreview()

    return () => {
      cancelled = true
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
      }
    }
  }, [document, open, teamId])

  const isImage = document ? isImageMimeType(document.mimeType) : false

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='flex h-[80vh] max-w-5xl flex-col overflow-hidden'>
        <DialogHeader>
          <DialogTitle className='truncate pr-8'>
            {document?.originalName ?? 'Documento'}
          </DialogTitle>
          <DialogDescription className='sr-only'>
            Pré-visualização do documento
          </DialogDescription>
        </DialogHeader>

        <div className='flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-lg bg-muted/40'>
          {isLoading ? (
            <Skeleton className='h-full w-full' />
          ) : hasError || !blobUrl || !document ? (
            <p className='text-sm text-muted-foreground'>
              Não foi possível pré-visualizar este ficheiro.
            </p>
          ) : isImage ? (
            <img
              src={blobUrl}
              alt={document.originalName}
              className='max-h-full max-w-full object-contain'
            />
          ) : (
            <iframe
              src={blobUrl}
              title={document.originalName}
              className='h-full w-full border-0 bg-background'
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function DocumentThumbnail({
  teamId,
  document,
}: {
  teamId: string
  document: DocumentSummary
}) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!isImageMimeType(document.mimeType)) {
      return
    }

    let cancelled = false
    let objectUrl: string | null = null

    async function loadThumbnail() {
      try {
        const blob = await apiBlob(
          `/teams/${teamId}/documents/${document.id}/file`,
          { toastOnError: false },
        )

        if (cancelled) {
          return
        }

        objectUrl = URL.createObjectURL(blob)

        if (cancelled) {
          URL.revokeObjectURL(objectUrl)
          return
        }

        setBlobUrl(objectUrl)
      } catch {
        if (!cancelled) {
          setBlobUrl(null)
        }
      }
    }

    void loadThumbnail()

    return () => {
      cancelled = true
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
      }
    }
  }, [document.id, document.mimeType, teamId])

  if (!isImageMimeType(document.mimeType)) {
    return (
      <div className='flex h-full w-full items-center justify-center bg-muted'>
        <FileText className='size-10 text-muted-foreground' />
      </div>
    )
  }

  if (!blobUrl) {
    return <Skeleton className='h-full w-full rounded-none' />
  }

  return (
    <img
      src={blobUrl}
      alt={document.originalName}
      className='h-full w-full object-cover'
    />
  )
}
