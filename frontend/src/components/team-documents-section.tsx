import { useCallback, useEffect, useRef, useState } from 'react'
import dayjs from 'dayjs'
import { FileUp, Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'

import { DeleteDocumentDialog } from '@/components/delete-document-dialog'
import {
  DocumentPreviewDialog,
  DocumentThumbnail,
} from '@/components/document-preview-dialog'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api-handler'
import { cn } from '@/lib/utils'
import type {
  DocumentResponse,
  DocumentSummary,
  DocumentsListResponse,
} from '@/types/document'

const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024
const ACCEPTED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
])
const ACCEPTED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.webp', '.gif']
const FILE_INPUT_ACCEPT = [...ACCEPTED_MIME_TYPES, ...ACCEPTED_EXTENSIONS].join(
  ',',
)

interface TeamDocumentsSectionProps {
  teamId: string
  canDelete: boolean
}

function isAllowedFile(file: File): boolean {
  if (ACCEPTED_MIME_TYPES.has(file.type)) {
    return true
  }

  const name = file.name.toLowerCase()
  return ACCEPTED_EXTENSIONS.some((extension) => name.endsWith(extension))
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function TeamDocumentsSection({
  teamId,
  canDelete,
}: TeamDocumentsSectionProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [documents, setDocuments] = useState<DocumentSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [documentToPreview, setDocumentToPreview] =
    useState<DocumentSummary | null>(null)
  const [documentToDelete, setDocumentToDelete] =
    useState<DocumentSummary | null>(null)

  const loadDocuments = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setIsLoading(true)
    }

    try {
      const data = await api<DocumentsListResponse>(
        `/teams/${teamId}/documents`,
      )
      setDocuments(data.documents)
    } finally {
      if (!options?.silent) {
        setIsLoading(false)
      }
    }
  }, [teamId])

  useEffect(() => {
    void loadDocuments()
  }, [loadDocuments])

  async function uploadFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList)
    const validFiles: File[] = []

    for (const file of files) {
      if (!isAllowedFile(file)) {
        toast.error(
          `${file.name}: apenas PDF ou imagens (JPEG, PNG, WebP, GIF)`,
        )
        continue
      }

      if (file.size > MAX_DOCUMENT_BYTES) {
        toast.error(`${file.name}: o ficheiro não pode ultrapassar 10 MB`)
        continue
      }

      validFiles.push(file)
    }

    if (validFiles.length === 0) {
      return
    }

    setIsUploading(true)

    try {
      for (const file of validFiles) {
        const formData = new FormData()
        formData.append('file', file)

        await api<DocumentResponse>(`/teams/${teamId}/documents`, {
          method: 'POST',
          body: formData,
        })
      }
    } finally {
      setIsUploading(false)
      await loadDocuments({ silent: true })

      if (inputRef.current) {
        inputRef.current.value = ''
      }
    }
  }

  return (
    <div className='flex flex-col gap-4'>
      <input
        ref={inputRef}
        type='file'
        accept={FILE_INPUT_ACCEPT}
        multiple
        className='sr-only'
        onChange={(event) => {
          if (event.target.files?.length) {
            void uploadFiles(event.target.files)
          }
        }}
      />

      <button
        type='button'
        disabled={isUploading}
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault()
          setIsDragging(false)
          if (event.dataTransfer.files.length) {
            void uploadFiles(event.dataTransfer.files)
          }
        }}
        className={cn(
          'flex min-h-36 flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-6 py-8 text-center transition-colors',
          isDragging
            ? 'border-sidebar-primary bg-brand-soft/40'
            : 'border-sidebar-border bg-muted/30 hover:bg-muted/50',
          isUploading && 'pointer-events-none opacity-70',
        )}
      >
        {isUploading ? (
          <Upload className='size-8 animate-pulse text-sidebar-primary' />
        ) : (
          <FileUp className='size-8 text-muted-foreground' />
        )}
        <p className='text-sm font-medium'>
          {isUploading
            ? 'A enviar documentos...'
            : 'Arraste PDF ou imagens, ou clique para selecionar'}
        </p>
        <p className='text-sm text-muted-foreground'>
          PDF, JPEG, PNG, WebP ou GIF · até 10 MB
        </p>
      </button>

      {isLoading ? (
        <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className='h-48 rounded-xl' />
          ))}
        </div>
      ) : documents.length === 0 ? (
        <div className='flex min-h-32 flex-col items-center justify-center gap-1 rounded-xl border border-dashed bg-muted/20 p-6 text-center'>
          <p className='text-sm font-medium'>Nenhum documento ainda</p>
          <p className='text-sm text-muted-foreground'>
            Envie um PDF ou uma imagem para começar.
          </p>
        </div>
      ) : (
        <ul className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
          {documents.map((document) => (
            <li key={document.id}>
              <div className='group relative flex h-full flex-col overflow-hidden rounded-xl border bg-card shadow-sm'>
                <button
                  type='button'
                  className='flex flex-1 flex-col text-left'
                  onClick={() => setDocumentToPreview(document)}
                >
                  <div className='aspect-video overflow-hidden bg-muted'>
                    <DocumentThumbnail teamId={teamId} document={document} />
                  </div>
                  <div className='flex flex-col gap-1 p-3'>
                    <p className='truncate text-sm font-medium'>
                      {document.originalName}
                    </p>
                    <p className='text-xs text-muted-foreground'>
                      {document.uploadedBy.name} ·{' '}
                      {dayjs(document.createdAt).format('DD/MM/YYYY')} ·{' '}
                      {formatFileSize(document.sizeBytes)}
                    </p>
                  </div>
                </button>

                {canDelete ? (
                  <Button
                    type='button'
                    variant='ghost'
                    size='icon-xs'
                    aria-label={`Excluir ${document.originalName}`}
                    className='absolute top-2 right-2 bg-background/80 text-destructive hover:bg-background hover:text-destructive'
                    onClick={(event) => {
                      event.stopPropagation()
                      setDocumentToDelete(document)
                    }}
                  >
                    <Trash2 />
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      <DocumentPreviewDialog
        teamId={teamId}
        document={documentToPreview}
        open={documentToPreview !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDocumentToPreview(null)
          }
        }}
      />

      {canDelete ? (
        <DeleteDocumentDialog
          teamId={teamId}
          document={documentToDelete}
          open={documentToDelete !== null}
          onOpenChange={(open) => {
            if (!open) {
              setDocumentToDelete(null)
            }
          }}
          onDeleted={() => {
            setDocumentToDelete(null)
            void loadDocuments({ silent: true })
          }}
        />
      ) : null}
    </div>
  )
}
