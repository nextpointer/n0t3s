declare module "overtype" {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  export const OverType: any;

  /**
   * Re-exported from the bundled `markdown-actions` library so a custom
   * toolbar can inspect formatting state without pulling in the dependency.
   */
  export const markdownActions: {
    getActiveFormats(textarea: HTMLTextAreaElement): string[];
    hasFormat(textarea: HTMLTextAreaElement, format: string): boolean;
    toggleBold(textarea: HTMLTextAreaElement): void;
    toggleItalic(textarea: HTMLTextAreaElement): void;
    toggleCode(textarea: HTMLTextAreaElement): void;
    insertLink(
      textarea: HTMLTextAreaElement,
      options?: { url?: string; text?: string },
    ): void;
    toggleBulletList(textarea: HTMLTextAreaElement): void;
    toggleNumberedList(textarea: HTMLTextAreaElement): void;
    toggleQuote(textarea: HTMLTextAreaElement): void;
    toggleTaskList(textarea: HTMLTextAreaElement): void;
    insertHeader(
      textarea: HTMLTextAreaElement,
      level?: number,
      toggle?: boolean,
    ): void;
  };
}