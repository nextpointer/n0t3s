// Lightweight Shiki worker pool — routes highlight requests to workers
// without blocking the main thread

interface HighlightRequest {
  id: number;
  code: string;
  lang: string;
  theme: string;
}

interface HighlightResponse {
  id: number;
  html: string;
  error: string | null;
}

class ShikiWorkerPool {
  private worker: Worker | null = null;
  private pending = new Map<number, { resolve: (html: string) => void; reject: (err: Error) => void }>();
  private nextId = 0;
  private cache = new Map<string, string>();
  private initPromise: Promise<void> | null = null;

  private async init() {
    if (this.worker) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise<void>((resolve, reject) => {
      try {
        this.worker = new Worker(
          new URL("./shiki-worker.ts", import.meta.url),
          { type: "module" }
        );
        this.worker.onmessage = (e: MessageEvent<HighlightResponse>) => {
          const { id, html, error } = e.data;
          const pending = this.pending.get(id);
          if (pending) {
            this.pending.delete(id);
            if (error) pending.reject(new Error(error));
            else pending.resolve(html);
          }
        };
        this.worker.onerror = (e) => {
          reject(e.error || new Error("Worker failed"));
        };
        resolve();
      } catch (err) {
        reject(err);
      }
    });
    return this.initPromise;
  }

  async highlight(code: string, lang: string, theme: string): Promise<string> {
    const cacheKey = `${lang}:${theme}:${code}`;
    if (this.cache.has(cacheKey)) return this.cache.get(cacheKey)!;

    await this.init();

    return new Promise<string>((resolve, reject) => {
      const id = this.nextId++;
      this.pending.set(id, { resolve, reject });
      this.worker!.postMessage({ id, code, lang, theme } satisfies HighlightRequest);
    }).then((html) => {
      // Cache with size limit (max 500 entries)
      if (this.cache.size > 500) {
        const firstKey = this.cache.keys().next().value!;
        this.cache.delete(firstKey);
      }
      this.cache.set(cacheKey, html);
      return html;
    });
  }

  terminate() {
    this.worker?.terminate();
    this.worker = null;
    this.initPromise = null;
  }
}

export const shikiPool = new ShikiWorkerPool();
