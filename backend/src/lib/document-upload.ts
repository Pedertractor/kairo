export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;

export const ALLOWED_DOCUMENT_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const MIME_TO_EXTENSION: Record<string, string> = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

export function extensionForMimeType(mimeType: string): string {
  return MIME_TO_EXTENSION[mimeType] ?? '';
}

export function isAllowedDocumentMimeType(mimeType: string): boolean {
  return ALLOWED_DOCUMENT_MIME_TYPES.has(mimeType);
}
