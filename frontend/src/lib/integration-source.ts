const INTEGRATION_SOURCE_LABELS: Record<string, string> = {
  'solicitacao-eng-mecanica': 'Solicitação Eng. Mecânica',
}

export function getIntegrationSourceLabel(
  source: string | null | undefined,
): string | null {
  if (!source) {
    return null
  }

  return INTEGRATION_SOURCE_LABELS[source] ?? source
}
