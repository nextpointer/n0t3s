export interface Note {
  id: string;
  title: string;
  content: string;
  tags?: string[];
  createdAt: number;
  updatedAt: number;
  /** When set, the note is temporary and auto-deletes after this timestamp. */
  expiresAt?: number;
}

export type AIAction =
  | "summarize"
  | "rewrite"
  | "grammar"
  | "expand"
  | "simplify"
  | "todo"
  | "edit";
