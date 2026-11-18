import { DocumentsSection } from '@/components/documents-section'

export function TeamDocumentsSection({ teamId, canDelete, canUpload = true }: {
  teamId: string
  canDelete: boolean
  canUpload?: boolean
}) {
  return (
    <DocumentsSection
      documentsPath={`/teams/${teamId}/documents`}
      canDelete={canDelete}
      canUpload={canUpload}
    />
  )
}
