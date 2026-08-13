export interface DocumentUploaderSummary {
  id: string;
  name: string;
}

export interface DocumentSummary {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedBy: DocumentUploaderSummary;
  createdAt: string;
}

export interface DocumentFile {
  originalName: string;
  mimeType: string;
  storageKey: string;
}
