export const MAX_NOTE_CHARS = 50_000; // under-the-hood editor safety limit
export const MAX_AI_SELECTION_CHARS = 6_000;

export function isNoteTooLarge(content: string | null | undefined, title?: string | null): boolean {
  const total = (content?.length ?? 0) + (title?.length ?? 0);
  return total > MAX_NOTE_CHARS;
}

export function formatCharLimit(n: number): string {
  if (n >= 1000) return `${Math.round(n / 1000)}k characters`;
  return `${n} characters`;
}
