import { DocumentsSection } from '@/components/documents-section'

export function TeamDocumentsSection({ teamId, canDelete }: {
  teamId: string
  canDelete: boolean
}) {
  return <DocumentsSection documentsPath={`/teams/${teamId}/documents`} canDelete={canDelete} />
}
