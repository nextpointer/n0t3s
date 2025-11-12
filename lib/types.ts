export interface Note {
  id: string;
  title: string;
  content: string;
  tags?: string[];
  createdAt: number;
  updatedAt: number;
}

export type AIAction =
  | "summarize"
  | "rewrite"
  | "grammar"
  | "expand"
  | "simplify"
  | "ask"
  | "todo"
  | "prompt";
