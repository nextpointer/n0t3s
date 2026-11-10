import { createHash } from "node:crypto";
import { LRUCache } from "lru-cache";
import { AIAction } from "./types";
import { groq } from "@ai-sdk/groq";
import { generateText } from "ai";

// System prompt

const SYSTEM_PROMPT = `You are a fast, precise writing assistant inside a notes app (Notion-like quality).

OUTPUT (strict):
- Return ONLY the final content. Output the content itself and nothing else.
- No preamble of any kind: never write "Here is...", "Here it is", "This is the result", "Result:", "Edited:", "Revised version:", or similar.
- No postamble or explanations.
- Never wrap the whole response in code fences.
- Do not add headings/labels unless they existed or are essential to the requested structure.
- Preserve meaning, key details, names, numbers, links, line breaks, and existing markdown unless the task requires changes.
- Match the author's language and tone when appropriate; be clear and high-signal.
- If the input is empty or unusable, return it unchanged.`;

// Per-action instructions
const ACTION_INSTRUCTIONS: Record<AIAction, string> = {
  summarize: `Summarize into crisp, high-signal bullet points.
- 3–6 bullets (fewer if short), one idea each, most important first.
- Keep facts, names, numbers, and terms accurate. No filler like "This note discusses".`,

  rewrite: `Rewrite for clarity and flow, Notion-style: clean, direct, easy to scan.
- Keep every fact and the original meaning; do not invent or drop information.
- Improve structure, sentence rhythm, and word choice while preserving useful markdown and the overall intent.
- Change only what improves the writing; avoid unnecessary additions or structural changes.`,

  grammar: `Fix spelling, grammar, punctuation, capitalization, and clear typos.
- Correct every error you find while keeping the original meaning, tone, wording, structure, line breaks, and markdown formatting intact.
- Do not rewrite for style or make unrelated changes. Return the corrected text (unchanged only if it is already fully correct).`,

  expand: `Expand with helpful, relevant detail while staying accurate.
- Build on what's there (context, examples, steps); don't contradict or pad.
- Add ~40–80% more substance. Match the note's tone and markdown style.`,

  simplify: `Simplify so it's easy to understand at a glance.
- Short sentences, plain words, same meaning. Keep essential terms.
- Preserve headings/lists/checklists.`,

  todo: `Convert into a clean markdown task list.
- Actionable items: "- [ ] ..."; completed/past items: "- [x] ...".
- Verb-first, concise tasks. Group related items with a blank line; use a short **bold** group label only when helpful.
- Put non-actionable context in a single blockquote above tasks only if needed.`,

  edit: `Edit the text by following the user's instruction precisely.
- Apply only the requested changes; keep everything else intact unless the instruction clearly requires changing it.
- Preserve meaning, important details, line breaks, and markdown/formatting. Be direct and high-signal. Do not add commentary.`,

  title: `Read the ENTIRE note and generate a short, meaningful title that summarizes what the note is about overall.
- Return ONLY the title as plain text on a single line.
- Keep it concise and specific (ideally 3–7 words).
- Synthesize the main topic/purpose from the full content; do NOT copy, repeat, or lightly rephrase the first line, first heading, or opening sentence. The title must reflect the whole note, not just its beginning.
- No labels or prefixes (no "Title:", "Heading:", "---"), no bullets/dashes, no markdown (#, *, _), no quotes, no explanation, and no trailing period.`,
};

// Per-action temperature

const ACTION_TEMPERATURE: Record<AIAction, number> = {
  grammar: 0.05,
  todo: 0.1,
  summarize: 0.2,
  simplify: 0.2,
  edit: 0.25,
  rewrite: 0.4,
  expand: 0.6,
  title: 0.35,
};

// Per-action max tokens (tight for speed; expand/edit can be larger)
const ACTION_MAX_TOKENS: Record<AIAction, number> = {
  summarize: 384,
  rewrite: 1536,
  grammar: 1536,
  expand: 2048,
  simplify: 1024,
  todo: 768,
  edit: 2048,
  title: 48,
};

//  Response cache (1 hour TTL, max 500 entries)
const responseCache = new LRUCache<string, string>({
  max: 500,
  ttl: 60 * 60 * 1000,
});

// Fast default for snappy rewrites; override with GENAI_MODEL (e.g. a larger
// quality model) when needed.
const MODEL_NAME = process.env.GENAI_MODEL ?? "llama-3.1-8b-instant";

// ─── Output cleaner ───────────────────────────────────────────────────────────
function stripPreamble(text: string): string {
  let out = text.trim();
  // Strip common leading labels/preambles, possibly across a first blank line.
  const patterns = [
    /^(?:here(?:'s| is| you go)(?:\s+the|\s+your|\s+an?)?[^:\n]*|this is(?:\s+the)?[^:\n]*|sure[!,]?|certainly[!,]?|of course[!,]?|absolutely[!,]?)[\s:!\-–—]*\n?/i,
    /^(?:(?:the\s+)?(?:edited|revised|updated|rewritten|summarized|expanded|simplified|result(?:ing)?|final|new|output|response|version|note|text|content)(?:\s+(?:version|result|output|text|note|content))?)\s*[:\-–—]\s*\n?/i,
  ];
  for (let i = 0; i < 3; i++) {
    const before = out;
    for (const re of patterns) out = out.replace(re, "").trimStart();
    if (out === before) break;
  }
  return out;
}

function cleanOutput(text: string): string {
  if (!text) return "";

  let out = text
    .trim()
    // Remove markdown code fences wrapping the whole response.
    .replace(/^```(?:markdown|md|text)?\s*\n/i, "")
    .replace(/\n```\s*$/i, "")
    .trim();

  out = stripPreamble(out);

  out = out
    // Remove trailing meta-commentary
    .replace(
      /\n+(?:Let me know|Hope this|Feel free|If you(?:'d| would) like|I(?:'ve| have) (?:rewritten|summarized|expanded|simplified|converted|fixed|edited|updated))[^\n]*/gi,
      "",
    )
    // Remove wrapping quotes (only if they wrap the ENTIRE output)
    .replace(/^"([\s\S]+)"$/, "$1")
    .replace(/^'([\s\S]+)'$/, "$1")
    .trim();

  return stripPreamble(out);
}

function dedupeAIOutput(output: string, input: string, action: AIAction): string {
  const inTrim = input.trim();
  const outTrim = output.trim();
  if (!inTrim || !outTrim) return output;

  // Exact duplicate of the whole input.
  if (outTrim === `${inTrim}\n${inTrim}` || outTrim === `${inTrim}\n\n${inTrim}`) {
    return inTrim;
  }

  // If the model echoed the original and then provided another version, prefer the non-echo.
  // Common repetition: original selection/text followed by the corrected/rewritten result.
  if (outTrim.length >= Math.max(12, Math.floor(inTrim.length * 1.4))) {
    if (outTrim.startsWith(inTrim)) {
      const tail = output.slice(output.indexOf(inTrim) + inTrim.length).replace(/^\s+/, "");
      if (tail.trim() && tail.trim() !== inTrim) return tail;
    }
    if (outTrim.endsWith(inTrim)) {
      const idx = output.lastIndexOf(inTrim);
      if (idx > 0) {
        const head = output.slice(0, idx).replace(/\s+$/, "");
        if (head.trim() && head.trim() !== inTrim) return head;
      }
    }
  }

  // For transform-in-place actions, remove clear duplicated echoes of the full input.
  if (["grammar", "rewrite", "simplify", "edit"].includes(action)) {
    const occurrences = outTrim.split(inTrim).length - 1;
    if (occurrences >= 2 && outTrim.length <= inTrim.length * 2 + 16) {
      return inTrim;
    }
    // If output contains the entire original plus an extra transformed remainder, drop the original block.
    const first = outTrim.indexOf(inTrim);
    if (first !== -1) {
      const remainder = (outTrim.slice(0, first) + outTrim.slice(first + inTrim.length)).trim();
      if (remainder && remainder !== inTrim && outTrim.length >= Math.floor(inTrim.length * 1.6)) {
        return remainder;
      }
    }
  }

  return output;
}

//  Main export
export async function performAIAction(
  content: string,
  action: AIAction,
  instruction?: string,
  options?: { noteContext?: string },
): Promise<string> {
  if (!content?.trim()) throw new Error("Not able to edit");
  if (!(action in ACTION_INSTRUCTIONS))
    throw new Error(`Invalid action: ${action}`);
  const inst = (instruction || "").trim();
  if (action === "edit" && !inst) throw new Error("Instruction is required");
  const noteContext = (options?.noteContext || "").trim();

  // Cache key includes model + action + content + context (+ instruction)
  const cacheKey = createHash("sha256")
    .update(`${MODEL_NAME}::${action}::${inst}::${content}::${noteContext}`)
    .digest("hex");

  const cached = responseCache.get(cacheKey);
  if (cached) return cached;

  const isSelection = !!(noteContext && noteContext !== content);
  const contextBlock = isSelection
    ? `\n\nFull note context (for reference only; do not return this):\n${noteContext}`
    : "";
  const selectionNote = isSelection
    ? "\nIMPORTANT: You are editing only the selected portion below. Return ONLY the replacement for that exact selection (not the full note). Change only what is necessary; do not add, remove, or duplicate anything outside the requested change. Do not insert horizontal rules (---), do not create extra blank lines, and do not repeat or move surrounding text. If a single line is selected, return only that modified line. Preserve the selection's original line breaks and leading/trailing whitespace."
    : "";

  const minimalNote = !isSelection && action !== "title"
    ? "\nChange only what is needed for this task; do not make unrelated or extra edits."
    : "";

  const userContent =
    action === "edit"
      ? `${ACTION_INSTRUCTIONS[action]}${selectionNote}${minimalNote}\n\nInstruction:\n${inst}${contextBlock}\n\n---\nSelection/Note to edit:\n${content}`
      : action === "title"
        ? `${ACTION_INSTRUCTIONS[action]}\n\nFull note (analyze all of it to understand what it is about; do not use its first line as the title):\n${content}`
        : `${ACTION_INSTRUCTIONS[action]}${selectionNote}${minimalNote}${contextBlock}\n\n---\n\n${content}`;

  try {
    const { text } = await generateText({
      model: groq(MODEL_NAME),
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userContent }],
      temperature: ACTION_TEMPERATURE[action],
      maxOutputTokens: ACTION_MAX_TOKENS[action],
      abortSignal: AbortSignal.timeout(60_000),
    });

    const output = cleanOutput(text ?? "");
    const deduped = dedupeAIOutput(output, content, action);
    const finalOutput = deduped.length > 0 ? deduped : content.trim();

    responseCache.set(cacheKey, finalOutput);
    return finalOutput;
  } catch (error) {
    console.error(`AI Error [${action}] model=${MODEL_NAME}:`, error);
    const msg =
      error && typeof error === "object" && "message" in error
        ? String((error as { message?: unknown }).message || "")
        : "";
    // Surface a useful hint without leaking secrets.
    if (/model|not found|unsupported|does not exist/i.test(msg)) {
      throw new Error(`Model unavailable (${MODEL_NAME}). Check GENAI_MODEL / API access.`);
    }
    if (/api.?key|unauthorized|401|403/i.test(msg)) {
      throw new Error("AI API key missing or invalid.");
    }
    if (/timeout|abort/i.test(msg)) {
      throw new Error("AI took too long. Try again.");
    }
    throw new Error("AI request failed. Try again.");
  }
}
