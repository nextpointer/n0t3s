// Languages registered with Shiki in the highlight worker, plus fence-info
// normalisation.
//
// Shiki only highlights a language that was explicitly registered at
// createHighlighter() time. Anything else throws inside the worker, which
// silently fell back to unstyled plain text — that is why `diff` blocks and
// several other common languages looked unstyled.

export const SHIKI_LANGS = [
  // web
  "javascript", "typescript", "jsx", "tsx", "vue", "svelte", "html", "xml",
  "css", "scss", "less", "json", "jsonc", "yaml", "toml", "ini",
  // systems
  "python", "rust", "go", "java", "kotlin", "swift", "c", "cpp", "csharp",
  "objective-c", "scala", "dart", "php", "ruby", "perl", "lua", "haskell",
  "elixir", "erlang", "clojure", "r", "julia", "zig",
  // shell / infra
  "bash", "shell", "zsh", "fish", "powershell", "docker", "dockerfile",
  "nginx", "apache", "make", "cmake", "graphql", "prisma", "terraform",
  // data / query
  "sql",
  // docs / misc
  //
  // Only real bundled grammars belong here: createHighlighter() throws on an
  // unknown name and takes the whole worker down, so every entry is verified.
  // `text` is deliberately absent — shiki handles plain text without a
  // registered grammar, and we skip highlighting for it entirely.
  "markdown", "mdx", "diff",
] as const;

/**
 * Map a markdown fence info string onto a registered Shiki language.
 * Returns null when nothing matches, so the caller can skip highlighting
 * rather than queueing work that will fall back to plain text.
 */
const ALIASES: Record<string, string> = {
  js: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  jsx: "jsx",
  ts: "typescript",
  mts: "typescript",
  cts: "typescript",
  tsx: "tsx",
  sh: "bash",
  shell: "bash",
  zsh: "zsh",
  console: "shell",
  terminal: "shell",
  py: "python",
  python3: "python",
  rs: "rust",
  rb: "ruby",
  golang: "go",
  kt: "kotlin",
  objc: "objective-c",
  "obj-c": "objective-c",
  cs: "csharp",
  "c#": "csharp",
  yml: "yaml",
  json5: "jsonc",
  htm: "html",
  toml: "toml",
  conf: "ini",
  properties: "ini",
  docker: "docker",
  dockerfile: "dockerfile",
  makefile: "make",
  tf: "terraform",
  hcl: "terraform",
  gql: "graphql",
  psql: "sql",
  mysql: "sql",
  scss: "scss",
  patch: "diff",
  diff: "diff",
  text: "text",
  txt: "text",
  plain: "text",
  plaintext: "text",
  "": "text",
};

const REGISTERED = new Set<string>(SHIKI_LANGS as readonly string[]);

export function normalizeLang(lang: string | undefined | null): string | null {
  // Fence info strings can carry attributes, e.g. ```js title="x"
  const first = (lang ?? "").trim().split(/[\s,{:]/)[0].toLowerCase();
  const mapped = ALIASES[first] ?? first;
  // Plain text has no grammar and nothing to colour — skip the worker round
  // trip rather than paying for a pass-through.
  if (mapped === "text") return null;
  return REGISTERED.has(mapped) ? mapped : null;
}