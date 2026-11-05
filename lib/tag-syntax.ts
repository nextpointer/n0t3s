import OverTypeLib from "overtype";

/**
 * Inline `#tag` mentions — Obsidian-style.
 *
 * Tags live inside the note text itself; there is no separate tag field.
 * Two independent passes exist because the raw source and the parsed HTML
 * answer different questions:
 *
 * - `extractTags` reads the raw markdown for data (filtering, pinning,
 *   migration, autocomplete suggestions) and must skip fenced code blocks
 *   and `` `inline code` `` spans.
 * - `renderTagsInLine` rewrites one already-parsed HTML line for the editor,
 *   wrapping each valid tag in a pill span. OverType guarantees that every
 *   character keeps its exact position, so the wrapper may only colour —
 *   never reflow.
 *
 * Both passes MUST agree on what counts as a tag, or a pill would render
 * for a token the never lands on a note. The shared rule:
 *
 *   `#` immediately followed by tag characters, where the character before
 *   `#` is not alphanumeric/underscore, another `#`, `/`, `.` (that last one
 *   keeps URL fragments like example.com/#frag out) or `&` (the parser
 *   escapes text before the renderer sees it, so a literal `&#39;` — an
 *   apostrophe entity — must never read as a `#39` tag). `#tag` must also
 *   contain at least one letter or underscore — `#2024` is not a tag — and
 *   trailing separators never match, so `#work.` tags `work` and leaves the
 *   dot alone. Nested subtags are allowed: `#work/urgent`.
 */

const TAG_BODY =
  "[A-Za-z0-9_]+(?:[-_][A-Za-z0-9_]+)*(?:/[A-Za-z0-9_]+(?:[-_][A-Za-z0-9_]+)*)*";

/** `#` plus a tag body. `g`/`lastIndex` is never mutated; `matchAll` copies state. */
const TAG_PATTERN = `#(${TAG_BODY})`;

/**
 * True when the given tag is usable. Pure numbers/separators (#2024) are
 * left alone so dates and version numbers stay plain text.
 */
export function isTaggable(token: string): boolean {
  return /[A-Za-z_]/.test(token);
}

/** Lowercase a legacy/free-typed tag into comparable form, or null if empty. */
function toTagKey(value: string): string | null {
  const key = value.trim().toLowerCase();
  return key ? key : null;
}

/** Fence states while walking the source, mirroring OverType's own scanner. */
function isFenceOpen(line: string): string | null {
  const open = /^ {0,3}(`{3,})[^`]*$/.exec(line);
  return open ? open[1] : null;
}

function isFenceClose(line: string, opening: string): boolean {
  return new RegExp(`^ {0,3}${opening}[\\t ]*$`).test(line);
}

/**
 * Every inline tag mentioned in a note's raw content, in first-seen order,
 * lowercased and deduplicated.
 */
export function extractTags(source: string): string[] {
  if (!source) return [];

  const found: string[] = [];
  const seen = new Set<string>();
  let opening: string | null = null;
  const tagRe = new RegExp(TAG_PATTERN, "g");

  for (const rawLine of source.split("\n")) {
    if (opening) {
      if (isFenceClose(rawLine, opening)) opening = null;
      continue;
    }
    const fence = isFenceOpen(rawLine);
    if (fence) {
      opening = fence;
      continue;
    }
    // Mask balanced inline-code spans so their contents are never parsed.
    const line = rawLine.replace(/(`+)([^`]*)\1/g, (m) => " ".repeat(m.length));

    for (const match of line.matchAll(tagRe)) {
      // Obsidian boundary: the character before `#` may not fold a tag into
      // a word (`foo#bar`), a URL path (`a.com/#frag`) or an entity (`&#39;`).
      if (match.index > 0) {
        const prev = line[match.index - 1];
        if (/[A-Za-z0-9_#/.&]/.test(prev)) continue;
        // `\#` escapes the marker in markdown.
        if (prev === "\\") continue;
      }

      const key = toTagKey(match[1]);
      if (key && isTaggable(key) && !seen.has(key)) {
        seen.add(key);
        found.push(key);
      }
    }
  }

  return found;
}

/**
 * All tags attached to a note: inline `#mentions` from the content plus the
 * legacy `tags` field kept around for the one-time inline migration.
 * Both lists are lowercased so filtering stays case-insensitive.
 */
export function getNoteTags(note: {
  content?: string;
  tags?: string[];
}): string[] {
  const inline = extractTags(note.content ?? "");
  const legacy: string[] = [];
  const seen = new Set<string>(inline);

  for (const tag of note.tags ?? []) {
    const key = toTagKey(tag);
    if (key && !seen.has(key)) {
      seen.add(key);
      legacy.push(key);
    }
  }
  return [...legacy, ...inline];
}

/**
 * Turn one legacy/free-typed tag into a token the inline syntax accepts:
 * lowercased, spaces dashed, punctuation stripped. Returns null when
 * nothing taggable remains (pure numbers like #2024 are not tags).
 */
export function legacyTagToToken(tag: unknown): string | null {
  if (typeof tag !== "string") return null;
  const token = tag
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9_/-]+/g, "");
  return token && isTaggable(token) ? token : null;
}

/**
 * Convert a legacy tag list into inline-ready tokens (used by migration).
 */
export function legacyTagsToInline(tags: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const tag of tags) {
    const token = legacyTagToToken(tag);
    if (!token || seen.has(token)) continue;
    seen.add(token);
    out.push(token);
  }
  return out;
}

/**
 * Are the caret's surroundings an open tag mention (`#` plus an optional
 * partial body, no whitespace yet)? Returns the `#` offset and the text
 * already typed so the autocomplete can offer completions.
 *
 * Fenced blocks and inline-code spans are not editable syntax in the same
 * way, so no trigger fires inside them.
 */
export function getTagTriggerAt(
  source: string,
  caret: number,
): { start: number; query: string } | null {
  if (caret <= 0 || caret > source.length) return null;

  // Inline code: an odd number of backticks before the caret on this line.
  const lineStart = source.lastIndexOf("\n", caret - 1) + 1;
  const line = source.slice(lineStart, caret);
  const backticks = (line.match(/`/g) ?? []).length;
  if (backticks % 2 === 1) return null;

  // Fences: an unmatched ``` at column 0-3 above the caret.
  let opening: string | null = null;
  for (const lineText of source.slice(0, caret).split("\n")) {
    if (opening) {
      if (isFenceClose(lineText, opening)) opening = null;
      continue;
    }
    const fence = isFenceOpen(lineText);
    if (fence) opening = fence;
  }
  if (opening) return null;

  // Walk back over tag body characters. If the character before that run is
  // not `#`, the caret is not inside a mention.
  let start = caret;
  while (start > 0 && /[A-Za-z0-9_/-]/.test(source[start - 1])) start--;
  if (start === 0 || source[start - 1] !== "#") return null;

  // Same boundary rule as extraction: not inside a word, not a URL fragment,
  // not an escaped `\#`.
  if (start > 1) {
    const before = source[start - 2];
    if (/[A-Za-z0-9_#/.&]/.test(before) || before === "\\") return null;
  }

  const query = source.slice(start, caret);
  if (query && !isTaggable(query)) return null;

  return { start: start - 1, query };
}

/**
 * Wraps every `#tag` in one parsed HTML line with the pill markup.
 *
 * The processor receives HTML that OverType has already escaped and styled,
 * so it walks the line and only touches plain text runs, leaving `code`,
 * `a` (links own their URLs) and literal markup alone. Pill spans add no
 * characters and carry no padding, which is what keeps the textarea and the
 * rendered layer character-for-character aligned.
 */
function renderTagsInLine(html: string): string {
  // Fence marker lines (` ``` `) are pure syntax; their info strings must
  // stay untagged because extraction skips that whole region.
  if (html.includes('class="code-fence"') || !html.includes("#")) return html;

  // Regions whose text is never a tag token: inline code spans and links.
  const ranges: Array<[number, number]> = [];
  for (const re of [
    /<code>[\s\S]*?<\/code>/g,
    /<a\s[\s\S]*?<\/a>/g,
  ] as const) {
    for (const m of html.matchAll(re)) {
      ranges.push([m.index, m.index + m[0].length]);
    }
  }
  const inProtected = (index: number) =>
    ranges.some(([from, to]) => index >= from && index < to);

  let out = "";
  let cursor = 0;
  // Trailing context for the boundary check — a `#` that starts its own text
  // run inherits the last character seen (e.g. an emphasis marker).
  let lastChar = "";

  while (cursor < html.length) {
    // Markup `<...>` and protected regions are copied verbatim.
    while (cursor < html.length) {
      if (inProtected(cursor)) {
        const end = ranges.find(([from]) => from === cursor)![1];
        out += html.slice(cursor, end);
        cursor = end;
        continue;
      }
      if (html[cursor] === "<") {
        const close = html.indexOf(">", cursor);
        const stop = close === -1 ? html.length : close + 1;
        out += html.slice(cursor, stop);
        cursor = stop;
        continue;
      }
      break;
    }
    if (cursor >= html.length) break;

    // Plain text run up to the next `<` or protected region.
    let runEnd = cursor;
    while (
      runEnd < html.length &&
      html[runEnd] !== "<" &&
      !inProtected(runEnd)
    ) {
      runEnd++;
    }

    const text = html.slice(cursor, runEnd);
    const runStart = cursor;
    let runOut = "";
    let runCursor = 0;
    const tagRe = new RegExp(TAG_PATTERN, "g");

    while (runCursor < text.length) {
      tagRe.lastIndex = runCursor;
      const match = tagRe.exec(text);
      if (!match) {
        runOut += text.slice(runCursor);
        lastChar = text[text.length - 1] ?? lastChar;
        break;
      }

      runOut += text.slice(runCursor, match.index);
      const boundary: string | undefined =
        match.index > 0
          ? text[match.index - 1]
          : runStart === 0
            ? undefined
            : lastChar;
      const folded =
        boundary !== undefined &&
        // Same boundary rule as extraction, entity-aware `&` included; pure
        // numbers (#2024, #39 out of &#39;) never render as pills either —
        // extraction rejects them, so rendering must too.
        (/[\w#/.&]/.test(boundary) || boundary === "\\") ||
        !isTaggable(match[1]);

      if (folded) {
        runOut += match[0];
      } else {
        runOut += `<span class="ot-tag" data-tag="${match[1].toLowerCase()}"><span class="syntax-marker">#</span>${match[1]}</span>`;
      }
      runCursor = match.index + match[0].length;
      lastChar = match[0][match[0].length - 1];
    }

    out += runOut;
    cursor = runEnd;
  }

  return out;
}

let tagSyntaxInstalled = false;

/**
 * Register the tag renderer with OverType's parser. Safe to call repeatedly
 * (ownership is recorded in module state), and global by design — one
 * parser class drives every editor instance, so the help page's read-only
 * editor renders tag pills without extra wiring.
 */
export function installTagSyntax(): void {
  if (tagSyntaxInstalled) return;
  // The library's types blur the constructor/namespace boundary, but at
  // runtime the default export is the constructor carrying a static parser.
  const parserClass = (OverTypeLib as unknown as {
    MarkdownParser: { setCustomSyntax(processor: (html: string) => string): void };
  }).MarkdownParser;
  parserClass.setCustomSyntax(renderTagsInLine);
  tagSyntaxInstalled = true;
}
