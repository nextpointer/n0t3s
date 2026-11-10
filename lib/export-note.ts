"use client";

import { toBlob, toPng } from "html-to-image";
import { jsPDF } from "jspdf";
import { marked } from "marked";
import { normalizeLang } from "@/lib/shiki-langs";
import { shikiPool } from "@/lib/shiki-worker-pool";

type ImageRenderOptions = NonNullable<Parameters<typeof toBlob>[1]>;
type ShareNavigator = Navigator & {
  share?: (data?: ShareData) => Promise<void>;
  canShare?: (data?: ShareData) => boolean;
};
type PdfWithSetPage = jsPDF & { setPage?: (pageNumber: number) => jsPDF };

marked.setOptions({
  gfm: true,
  breaks: true,
});

export type ExportFormat = "markdown" | "text" | "html" | "pdf" | "image";

export const NOTE_BRAND_URL = "https://notes.nextpointer.dev";
export const NOTE_BRAND_LABEL = "Created by n0t3s";

const MAX_COPY_BYTES = 100 * 1024; // 100 KB

export function canCopyText(text: string): boolean {
  return new Blob([text]).size <= MAX_COPY_BYTES;
}

export function sanitizeFilename(title?: string): string {
  return (title || "note").replace(/[^a-z0-9]/gi, "_").replace(/_+/g, "_").toLowerCase();
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getMarkdown(title: string, content: string): string {
  const t = title || "Untitled";
  const body = content || "";
  return `# ${t}\n\n${body}`;
}

function sanitizeUrl(url: string): string {
  const raw = (url || "").trim();
  if (!raw) return "";
  if (raw.startsWith("#") || raw.startsWith("/") || raw.startsWith("./") || raw.startsWith("../")) return raw;
  try {
    const parsed = new URL(raw, window.location.origin);
    const proto = parsed.protocol.toLowerCase();
    if (proto === "http:" || proto === "https:" || proto === "mailto:" || proto === "tel:") return raw;
    if (proto === "data:" && /^data:image\//i.test(raw)) return raw;
  } catch {
    return "";
  }
  return "";
}

function sanitizeExportHtml(html: string): string {
  const allowed = new Set([
    "h1","h2","h3","h4","h5","h6","p","br","hr","strong","b","em","i","u","s","del","mark",
    "ul","ol","li","blockquote","pre","code","a","img","table","thead","tbody","tfoot","tr","th","td",
    "input","span","div","sup","sub"
  ]);
  const allowedAttrs: Record<string, Set<string>> = {
    a: new Set(["href","title"]),
    img: new Set(["src","alt","title","width","height"]),
    input: new Set(["type","checked","disabled"]),
    th: new Set(["colspan","rowspan","align"]),
    td: new Set(["colspan","rowspan","align"]),
    code: new Set(["class"]),
    pre: new Set(["class","style","tabindex"]),
    span: new Set(["class","style"]),
    div: new Set(["class","style"]),
    li: new Set(["class"]),
    ul: new Set(["class"]),
    ol: new Set(["class"]),
  };

  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
  const root = doc.body.firstElementChild;
  if (!root) return "";

  const elements = Array.from(root.querySelectorAll("*"));
  for (const el of elements) {
    const tag = el.tagName.toLowerCase();
    if (!allowed.has(tag)) {
      if (tag === "script" || tag === "style" || tag === "iframe" || tag === "object" || tag === "embed" || tag === "form") {
        el.remove();
      } else {
        const parent = el.parentNode;
        if (parent) {
          while (el.firstChild) parent.insertBefore(el.firstChild, el);
          parent.removeChild(el);
        }
      }
      continue;
    }

    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase();
      const value = attr.value;
      if (name.startsWith("on")) {
        el.removeAttribute(attr.name);
        continue;
      }
      const allowedForTag = allowedAttrs[tag];
      if (!allowedForTag || !allowedForTag.has(name)) {
        el.removeAttribute(attr.name);
        continue;
      }
      if ((tag === "a" && name === "href") || (tag === "img" && name === "src")) {
        const safe = sanitizeUrl(value);
        if (!safe) el.removeAttribute(attr.name);
        else el.setAttribute(attr.name, safe);
        continue;
      }
      if (tag === "input" && name === "type") {
        if (value.toLowerCase() !== "checkbox") el.setAttribute("type", "checkbox");
      }
      if (name === "checked") el.setAttribute("checked", "");
      if (name === "disabled") el.setAttribute("disabled", "");
    }

    if (tag === "input") {
      el.setAttribute("disabled", "");
    }
    if (tag === "a") {
      const href = el.getAttribute("href");
      if (href && !href.startsWith("#")) {
        el.setAttribute("target", "_blank");
        el.setAttribute("rel", "noopener noreferrer nofollow");
      }
    }
  }

  return root.innerHTML;
}

function markdownToBasicHtml(markdown: string): string {
  // Final fallback: preserve content safely with visible text.
  const text = (markdown || "").trim();
  if (!text) return `<p style="margin:0;opacity:.6">Empty note</p>`;
  return `<pre style="white-space:pre-wrap;word-break:break-word;margin:0;font:inherit;color:inherit;background:transparent">${escapeHtml(text)}</pre>`;
}

export function getPlainText(content: string): string {
  try {
    const html = marked.parse(content || "", { async: false }) as string;
    const doc = new DOMParser().parseFromString(`<div>${sanitizeExportHtml(html || "")}</div>`, "text/html");
    const text = (doc.body.textContent || "").replace(/\n{3,}/g, "\n\n").trim();
    if (text) return text;
  } catch {}
  // Fallback: lightweight markdown stripping
  return (content || "")
    .replace(/```[\s\S]*?```/g, (m) => m.replace(/```[^\n]*\n?|```/g, ""))
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^>\s?/gm, "")
    .replace(/^\s*([-*+]|\d+\.)\s+/gm, "")
    .replace(/^(\s*)- \[[ xX]\]\s+/gm, "$1")
    .replace(/[*_~]+/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

type ThemeMode = "light" | "dark";

function getTheme(mode: ThemeMode) {
  if (mode === "dark") {
    return {
      bg: "#09090b",
      surface: "#09090b",
      text: "#e2e8f0",
      muted: "#a1a1aa",
      border: "#27272a",
      hr: "#27272a",
      codeBg: "#18181b",
      code: "#e2e8f0",
      link: "#d4d4d8",
      accent: "#d4d4d8",
      h1: "#e2e8f0",
      h2: "#e2e8f0",
      h3: "#e2e8f0",
      strong: "#f4f4f5",
      em: "#e2e8f0",
      blockquote: "#a1a1aa",
    };
  }
  return {
    bg: "#ffffff",
    surface: "#ffffff",
    text: "#1a1a1a",
    muted: "#666666",
    border: "#e4e4e7",
    hr: "#e4e4e7",
    codeBg: "#f4f4f5",
    code: "#1a1a1a",
    link: "#333333",
    accent: "#444444",
    h1: "#1a1a1a",
    h2: "#1a1a1a",
    h3: "#1a1a1a",
    strong: "#000000",
    em: "#333333",
    blockquote: "#555555",
  };
}

function buildExportCss(mode: ThemeMode): string {
  const t = getTheme(mode);
  const fontNote = '\'Jetbrains Mono\', \'Space Mono\', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
  return `
    :root { color-scheme: ${mode}; }
    * { box-sizing: border-box; }
    body { margin: 0; background: ${t.bg}; color: ${t.text}; font-family: ${fontNote}; line-height: 1.7; }
    .export-root { width: 794px; max-width: 794px; min-height: 1123px; margin: 0 auto; padding: 40px 40px 28px; background: ${t.surface}; color: ${t.text}; font-family: ${fontNote}; display: flex; flex-direction: column; }
    .export-root, .export-root * { -webkit-font-smoothing: antialiased; }
    .export-title { font-size: 30px; line-height: 1.2; font-weight: 700; letter-spacing: -0.02em; margin: 0 0 18px; color: ${t.text}; font-family: ${fontNote}; }
    .export-content { font-size: 15px; line-height: 1.7; color: ${t.text}; word-wrap: break-word; overflow-wrap: anywhere; font-family: ${fontNote}; flex: 1 0 auto; }
    .export-content > :first-child { margin-top: 0 !important; }
    .export-content > :last-child { margin-bottom: 0 !important; }
    .export-content h1,.export-content h2,.export-content h3,.export-content h4,.export-content h5,.export-content h6 { line-height: 1.3; margin: 1.1em 0 0.45em; font-weight: 700; font-family: ${fontNote}; color: ${t.text}; }
    .export-content h1{font-size:1.7em} .export-content h2{font-size:1.4em} .export-content h3{font-size:1.18em}
    .export-content p,.export-content ul,.export-content ol,.export-content blockquote,.export-content pre,.export-content hr,.export-content table { margin: 0.7em 0; }
    .export-content ul,.export-content ol { padding-left: 1.5em; }
    .export-content li { margin: 0.2em 0; color: ${t.text}; }
    .export-content li > p { margin: 0.2em 0; }
    .export-content ul ul,.export-content ul ol,.export-content ol ul,.export-content ol ol { margin: 0.2em 0; }
    .export-content blockquote { margin-left: 0; padding: 0.1em 0 0.1em 1em; border-left: 3px solid ${t.border}; color: ${t.blockquote}; }
    .export-content blockquote, .export-content blockquote p, .export-content blockquote * { color: ${t.blockquote}; }
    .export-content code { font-family: ${fontNote}; font-size: 0.92em; background: ${t.codeBg}; color: ${t.code}; padding: 0.15em 0.38em; border-radius: 6px; border: 1px solid ${t.border}; }
    .export-content pre { background: ${t.codeBg}; color: ${t.code}; padding: 14px 16px; border-radius: 12px; overflow: auto; font-family: ${fontNote}; line-height: 1.6; border: 1px solid ${t.border}; }
    .export-content pre code { background: transparent; padding: 0; font-size: 0.92em; border: 0; border-radius: 0; white-space: pre; color: inherit; font-family: ${fontNote}; }
    .export-content pre:not(.shiki), .export-content pre:not(.shiki) * { color: ${t.code}; }
    .export-content pre.shiki { margin: 0.75em 0; padding: 14px 16px; border-radius: 12px; overflow: auto; border: 1px solid ${t.border}; }
    .export-content pre.shiki code { background: transparent; padding: 0; font-size: 0.92em; border: 0; border-radius: 0; white-space: pre; display: block; line-height: 1.6; }
    .export-content pre.shiki span { font-family: ${fontNote}; }
    .export-content a { color: ${t.link}; text-decoration: underline; text-underline-offset: 2px; }
    .export-content hr { border: 0; border-top: 1px solid ${t.hr}; }
    .export-content img { max-width: 100%; height: auto; border-radius: 10px; display: block; filter: grayscale(100%); }
    .export-content table { width: 100%; max-width: 100%; border-collapse: collapse; border-spacing: 0; font-size: 0.95em; table-layout: auto; display: table; }
    .export-content thead, .export-content tbody, .export-content tfoot { display: table-row-group; }
    .export-content tr { display: table-row; }
    .export-content th,.export-content td { border: 1px solid ${t.border}; padding: 8px 10px; text-align: left; vertical-align: top; color: ${t.text}; display: table-cell; white-space: normal; word-break: break-word; }
    .export-content th { font-weight: 700; background: ${mode === "dark" ? "#18181b" : "#f4f4f5"}; }
    .export-content strong { font-weight: 700; color: ${t.strong}; }
    .export-content em { font-style: italic; color: ${t.em}; }
    .export-content del { text-decoration: line-through; opacity: 0.75; }
    .export-content input[type="checkbox"] { margin: 0 0.45em 0 0; vertical-align: middle; accent-color: ${t.accent}; filter: grayscale(100%); }
    .export-content li.task-list-item, .export-content li:has(> input[type="checkbox"]) { list-style: none; }
    .export-content ul:has(> li > input[type="checkbox"]), .export-content ol:has(> li > input[type="checkbox"]) { padding-left: 1.2em; }
    .export-content p, .export-content li, .export-content blockquote, .export-content pre, .export-content tr, .export-content h1, .export-content h2, .export-content h3, .export-content h4 { break-inside: avoid; }
    .export-footer { margin-top: auto; padding-top: 28px; font-size: 11px; color: ${t.muted}; font-family: ${fontNote}; opacity: 0.5; letter-spacing: 0.01em; text-align: center; width: 100%; }
    .export-footer a { color: inherit; text-decoration: none; }
  `;
}

function decodeHtmlEntities(value: string): string {
  const doc = new DOMParser().parseFromString(value, "text/html");
  return doc.documentElement.textContent || "";
}

async function highlightCodeBlocks(html: string, mode: ThemeMode): Promise<string> {
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
  const root = doc.body.firstElementChild;
  if (!root) return html;
  const theme = mode === "dark" ? "github-dark" : "github-light";
  const blocks = Array.from(root.querySelectorAll("pre > code"));
  for (const codeEl of blocks) {
    const pre = codeEl.parentElement;
    if (!pre) continue;
    const cls = codeEl.getAttribute("class") || "";
    const m = cls.match(/language-([^\s"']+)/i);
    const lang = normalizeLang(m?.[1] || "");
    if (!lang) continue;
    const source = decodeHtmlEntities(codeEl.innerHTML);
    try {
      const highlighted = await shikiPool.highlight(source, lang, theme);
      const frag = new DOMParser().parseFromString(highlighted, "text/html");
      const newPre = frag.querySelector("pre");
      if (newPre) {
        newPre.classList.add("shiki");
        pre.replaceWith(newPre);
      }
    } catch {
      // keep plain block
    }
  }
  return root.innerHTML;
}

async function renderMarkdownToHtml(markdown: string, mode: ThemeMode): Promise<string> {
  const src = markdown || "";
  try {
    const html = marked.parse(src, { async: false }) as string;
    const safe = sanitizeExportHtml(html || "");
    const highlighted = await highlightCodeBlocks(safe, mode);
    const finalSafe = sanitizeExportHtml(highlighted || safe || "");
    if (finalSafe.trim()) return finalSafe;
  } catch {}
  return markdownToBasicHtml(src);
}

async function buildNoteBodyHtml(
  title: string,
  content: string,
  mode: ThemeMode,
  opts?: { footerText?: string },
): Promise<string> {
  const contentHtml = await renderMarkdownToHtml(content || "", mode);
  const footerText = opts?.footerText || NOTE_BRAND_LABEL;
  return `
    <h1 class="export-title">${escapeHtml(title || "Untitled")}</h1>
    <div class="export-content">${contentHtml}</div>
    <div class="export-footer"><a href="${NOTE_BRAND_URL}" target="_blank" rel="noopener noreferrer">${escapeHtml(footerText)}</a></div>
  `;
}

export async function getExportHtmlDocument(title: string, content: string, mode: ThemeMode): Promise<string> {
  const body = await buildNoteBodyHtml(title, content, mode);
  const css = buildExportCss(mode);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title || "Untitled")}</title>
<style>${css}</style>
</head>
<body>
  <article class="export-root">${body}</article>
</body>
</html>`;
}

async function renderExportNode(
  title: string,
  content: string,
  mode: ThemeMode,
  opts?: { footerText?: string },
): Promise<{ host: HTMLElement; article: HTMLElement }> {
  const t = getTheme(mode);
  const host = document.createElement("div");
  host.style.position = "fixed";
  host.style.left = "-100000px";
  host.style.top = "0";
  host.style.width = "794px"; // ~A4 width at 96dpi
  host.style.background = t.bg;
  host.style.color = t.text;
  host.style.zIndex = "-1";
  host.style.pointerEvents = "none";
  host.style.opacity = "1";
  host.style.overflow = "visible";
  host.style.fontFamily = '"JetBrains Mono", "Space Mono", ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  const style = document.createElement("style");
  style.textContent = buildExportCss(mode);
  const article = document.createElement("article");
  article.className = "export-root";
  article.style.width = "794px";
  article.style.maxWidth = "794px";
  article.style.margin = "0";
  article.style.background = t.surface;
  article.style.color = t.text;
  article.innerHTML = await buildNoteBodyHtml(title, content, mode, opts);
  article.prepend(style);
  host.appendChild(article);
  document.body.appendChild(host);

  // Help html-to-image/canvas capture when remote images allow CORS.
  article.querySelectorAll("img").forEach((img) => {
    try {
      img.setAttribute("crossorigin", "anonymous");
      (img as HTMLImageElement).crossOrigin = "anonymous";
    } catch {}
  });

  // allow layout/fonts to settle
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  await new Promise((r) => setTimeout(r, 80));
  return { host, article };
}

export async function exportAsImageBlob(title: string, content: string, mode: ThemeMode): Promise<Blob> {
  const { host, article } = await renderExportNode(title, content, mode, { footerText: "created by notes.nextpointer.dev" });
  try {
    await new Promise((r) => setTimeout(r, 0));
    const rawW = Math.ceil(article.scrollWidth || 794);
    const rawH = Math.ceil(article.scrollHeight || 400);
    const width = Math.max(320, Math.min(rawW, 1600));
    const height = Math.max(200, rawH);
    const pixelRatio = height > 12000 ? 1 : 2;
    const opts: ImageRenderOptions = {
      cacheBust: true,
      pixelRatio,
      backgroundColor: getTheme(mode).bg,
      width,
      height,
      style: { margin: "0", transform: "none" },
    };

    try {
      const blob = await toBlob(article, opts);
      if (blob && blob.size > 0) return blob;
    } catch {}

    const dataUrl = await toPng(article, opts);
    if (!dataUrl || dataUrl === "data:,") throw new Error("Failed to render image");
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    if (!blob || blob.size === 0) throw new Error("Failed to render image");
    return blob;
  } finally {
    host.remove();
  }
}

function computePdfSliceBreaks(article: HTMLElement, imgHeight: number, pageSlicePx: number): number[] {
  const rect = article.getBoundingClientRect();
  const cssHeight = Math.max(article.scrollHeight, rect.height, 1);
  const scale = imgHeight / cssHeight;
  const points = new Set<number>([0, imgHeight]);

  const selectors = [
    ".export-title",
    ".export-footer",
    ".export-content > *",
    ".export-content li",
    ".export-content tr",
    ".export-content pre",
    ".export-content blockquote",
    ".export-content p",
    ".export-content h1",
    ".export-content h2",
    ".export-content h3",
    ".export-content h4",
    ".export-content img",
    ".export-content hr",
  ];
  const els = article.querySelectorAll<HTMLElement>(selectors.join(","));
  els.forEach((el) => {
    const r = el.getBoundingClientRect();
    const bottom = (r.bottom - rect.top) * scale;
    if (bottom > 0 && bottom < imgHeight) points.add(Math.round(bottom));
  });

  const sorted = Array.from(points).sort((a, b) => a - b);
  const breaks: number[] = [0];
  let y = 0;
  const minChunk = Math.max(80, Math.floor(pageSlicePx * 0.35));

  while (y < imgHeight - 1) {
    const remaining = imgHeight - y;
    if (remaining <= pageSlicePx + Math.floor(pageSlicePx * 0.08)) {
      breaks.push(imgHeight);
      break;
    }
    const desired = y + pageSlicePx;
    let best = -1;
    for (let i = sorted.length - 1; i >= 0; i--) {
      const p = sorted[i];
      if (p <= desired && p >= y + minChunk) {
        best = p;
        break;
      }
    }
    if (best <= y) {
      // fallback: first breakpoint after desired, else hard cut
      best = sorted.find((p) => p > desired && p < imgHeight) ?? desired;
    }
    if (best <= y || best >= imgHeight) {
      breaks.push(imgHeight);
      break;
    }
    breaks.push(best);
    y = best;
  }

  return breaks;
}

export async function exportAsPdfBlob(title: string, content: string, mode: ThemeMode): Promise<Blob> {
  const { host, article } = await renderExportNode(title, content, mode);
  try {
    await new Promise((r) => setTimeout(r, 0));
    const rawW = Math.ceil(article.scrollWidth || 794);
    const rawH = Math.ceil(article.scrollHeight || 400);
    const width = Math.max(320, Math.min(rawW, 1600));
    const height = Math.max(200, rawH);
    const pixelRatio = height > 12000 ? 1 : 2;
    const opts: ImageRenderOptions = {
      cacheBust: true,
      pixelRatio,
      backgroundColor: getTheme(mode).bg,
      width,
      height,
      style: { margin: "0", transform: "none" },
    };
    const dataUrl = await toPng(article, opts);
    if (!dataUrl || dataUrl === "data:,") throw new Error("Failed to render PDF");

    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = dataUrl;
    });

    const pdf = new jsPDF({ orientation: "p", unit: "pt", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 28;
    const renderWidth = pageWidth - margin * 2;
    const pageContentHeight = pageHeight - margin * 2;
    const bgRgb = mode === "dark" ? [9, 9, 11] : [255, 255, 255];

    const paintPageBg = () => {
      try {
        pdf.setFillColor(bgRgb[0], bgRgb[1], bgRgb[2]);
        pdf.rect(0, 0, pageWidth, pageHeight, "F");
      } catch {}
    };

    const pageSlicePx = Math.floor((pageContentHeight * img.width) / renderWidth);
    const breaks = computePdfSliceBreaks(article, img.height, pageSlicePx);

    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not render PDF");
    ctx.drawImage(img, 0, 0);

    for (let idx = 0; idx < breaks.length - 1; idx++) {
      const y = breaks[idx];
      const next = breaks[idx + 1];
      const h = Math.max(1, next - y);
      if (idx > 0) pdf.addPage();
      paintPageBg();

      const slice = document.createElement("canvas");
      slice.width = img.width;
      slice.height = h;
      const sctx = slice.getContext("2d");
      if (!sctx) throw new Error("Could not render PDF");
      sctx.drawImage(canvas, 0, y, img.width, h, 0, 0, img.width, h);
      const sliceUrl = slice.toDataURL("image/png");
      const sliceRenderHeight = (h * renderWidth) / img.width;
      pdf.addImage(sliceUrl, "PNG", margin, margin, renderWidth, sliceRenderHeight, undefined, "FAST");
    }

    try {
      const footerEl = article.querySelector(".export-footer a, .export-footer") as HTMLElement | null;
      if (footerEl) {
        const articleRect = article.getBoundingClientRect();
        const footerRect = footerEl.getBoundingClientRect();
        const cssHeight = Math.max(article.scrollHeight, articleRect.height, 1);
        const scaleY = img.height / cssHeight;
        const footerTopImg = (footerRect.top - articleRect.top) * scaleY;
        const footerHeightImg = Math.max(footerRect.height, 12) * scaleY;
        const footerWidthImg = Math.max(footerRect.width, 120) * scaleY;
        const footerLeftImg = (footerRect.left - articleRect.left) * scaleY;

        let pageIndex = breaks.length - 2;
        for (let idx = 0; idx < breaks.length - 1; idx++) {
          if (footerTopImg >= breaks[idx] && footerTopImg < breaks[idx + 1]) {
            pageIndex = idx;
            break;
          }
        }

        const sliceTopImg = breaks[pageIndex];
        const pxToPt = renderWidth / img.width;
        const linkX = margin + footerLeftImg * pxToPt;
        const linkY = margin + (footerTopImg - sliceTopImg) * pxToPt;
        const linkW = Math.max(footerWidthImg * pxToPt, 80);
        const linkH = Math.max(footerHeightImg * pxToPt, 12);

        const pdfWithPage = pdf as PdfWithSetPage;
        if (typeof pdfWithPage.setPage === "function") {
          pdfWithPage.setPage(pageIndex + 1);
        }
        pdf.link(linkX, linkY, linkW, linkH, { url: NOTE_BRAND_URL });
      }
    } catch {}

    return pdf.output("blob");
  } finally {
    host.remove();
  }
}

export async function shareBlob(blob: Blob, filename: string, title: string): Promise<"shared" | "unsupported" | "cancelled"> {
  try {
    const file = new File([blob], filename, { type: blob.type || "application/octet-stream" });
    const nav = navigator as ShareNavigator;
    if (typeof nav.share !== "function") return "unsupported";
    if (typeof nav.canShare === "function" && !nav.canShare({ files: [file] })) return "unsupported";
    await nav.share({ files: [file], title: title || "Note" });
    return "shared";
  } catch (e: unknown) {
    if (e instanceof DOMException && (e.name === "AbortError" || e.name === "NotAllowedError")) return "cancelled";
    return "unsupported";
  }
}

export { getMarkdown };
