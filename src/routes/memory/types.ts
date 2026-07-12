export interface MemoryFileSummary {
  filename: string;
  size?: number | null;
  updated_at?: string | null;
}

export interface MemoryFile extends MemoryFileSummary {
  content: string;
}

export interface MemoryDraft {
  filename: string;
  content: string;
  originalFilename?: string;
}
