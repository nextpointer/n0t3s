import { createHash } from "node:crypto";
import { LRUCache } from "lru-cache";
import { AIAction } from "./types";
import { groq } from "@ai-sdk/groq";
import { generateText } from "ai";

// System prompt

const SYSTEM_PROMPT = `You are a markdown text processing assistant embedded in a notes app.

OUTPUT RULES (non-negotiable):
- Output ONLY the processed markdown content — nothing else
- Never wrap output in code fences (\`\`\` or \`\`\`markdown)
- Never add preamble: no "Here's", "Sure!", "Summary:", "Result:", "Output:"
- Never add postamble: no "Let me know", "Hope this helps", "I've rewritten..."
- Never add headers unless the original content had headers
- Preserve the author's voice and intent unless the action explicitly changes it
- If input is empty, gibberish, or unprocessable → return it unchanged, exactly

MARKDOWN RULES:
- Use standard markdown: **bold**, *italic*, \`code\`, - lists, 1. ordered, > blockquote
- Checkboxes: - [ ] unchecked, - [x] checked
- Preserve existing markdown formatting unless the action requires changing it`;

// Per-action instructions
const ACTION_INSTRUCTIONS: Record<AIAction, string> = {
  summarize: `Summarize the following note into concise bullet points.
Rules:
- Use - bullet points, not numbers
- Each bullet = one distinct idea, max 15 words
- Keep technical terms and proper nouns exactly as written
- Order bullets by importance, most important first
- Do not add bullets for meta-commentary ("The note discusses...")
- Aim for 3–7 bullets depending on content length`,

  rewrite: `Rewrite the following note for maximum clarity and readability.
Rules:
- Preserve every idea and fact — do not add or remove information
- Break long sentences into shorter ones (aim for ≤20 words per sentence)
- Fix passive voice where possible
- Keep paragraph structure unless it actively hurts clarity
- Preserve all markdown formatting (bold, italic, lists, code blocks)
- Do not change technical terms, names, or domain-specific language`,

  grammar: `Fix grammar and spelling errors in the following note.
Rules:
- Fix ONLY: spelling mistakes, grammatical errors, punctuation errors, subject-verb agreement
- Do NOT change: word choice, sentence structure, tone, style, paragraph order
- Do NOT add or remove content
- Do NOT reformat markdown — preserve all existing structure exactly
- If the text is already correct, return it unchanged`,

  expand: `Expand the following note with additional relevant detail.
Rules:
- Add context, examples, and elaboration that naturally fits the existing content
- Do not contradict or replace existing content — only build on it
- Match the author's tone and style
- Add roughly 50–100% more content than the original
- Use the same markdown formatting style as the original
- Do not add a conclusion or summary section unless the original had one`,

  simplify: `Simplify the following note to a 5th-grade reading level.
Rules:
- Replace complex words with simple everyday alternatives
- Break long sentences into short ones (target: ≤15 words each)
- Keep the same meaning — do not remove facts or ideas
- Use active voice throughout
- Keep technical terms only if they are essential and cannot be simplified
- Preserve list and heading structure from the original`,

  ask: `Answer the question or instruction contained in the following text.
Rules:
- Extract the core question or task and answer it directly
- If it is a math problem, solve it step by step and show the answer clearly
- If it asks for a list, return a markdown bullet list
- If it asks to compare things, use a clear structure (bullets or a table)
- If it is genuinely unanswerable or nonsensical, reply exactly: WTF NO ANSWER >:(
- Do not repeat the question back
- Keep the answer as short as accurate allows`,

  todo: `Convert the following note into a markdown task list.
Rules:
- Every actionable item becomes: - [ ] task description
- Already-done or past-tense items become: - [x] task description
- Group related tasks together with a blank line between groups
- If there are natural categories, add a **Category** heading above each group
- Non-actionable content (context, notes, background) goes in a > blockquote above the tasks
- Keep task descriptions concise — verb-first, max 10 words each`,

  prompt: `You are a markdown instruction parser. The input contains inline instructions in the format /[instruction] followed by content to apply them to.
Rules:
- Parse every /[...] instruction and apply it to the content that follows or precedes it
- Multiple instructions can appear in one note — apply each to its relevant section
- Output only the processed result — remove the /[...] markers from the output
- If an instruction is ambiguous, make the most reasonable interpretation
- Preserve all markdown formatting in the output
- If no /[...] instructions are found, return the content unchanged`,
};

// Per-action temperature

const ACTION_TEMPERATURE: Record<AIAction, number> = {
  grammar: 0.05,
  todo: 0.1,
  summarize: 0.2,
  simplify: 0.2,
  prompt: 0.2,
  ask: 0.3,
  rewrite: 0.4,
  expand: 0.6,
};

// Per-action max tokens
const ACTION_MAX_TOKENS: Record<AIAction, number> = {
  summarize: 512,
  rewrite: 2048,
  grammar: 2048,
  expand: 4096,
  simplify: 2048,
  ask: 1024,
  todo: 1024,
  prompt: 2048,
};

//  Response cache (1 hour TTL, max 500 entries)
const responseCache = new LRUCache<string, string>({
  max: 500,
  ttl: 60 * 60 * 1000,
});

const MODEL_NAME =
  process.env.GENAI_MODEL ?? "meta-llama/llama-4-scout-17b-16e-instruct";

// ─── Output cleaner ───────────────────────────────────────────────────────────
function cleanOutput(text: string): string {
  if (!text) return "";

  return (
    text
      .trim()
      // Remove markdown code fences (```markdown ... ``` or ``` ... ```)
      .replace(/^```(?:markdown|md)?\s*\n/i, "")
      .replace(/\n```\s*$/i, "")
      // Remove common preamble patterns
      .replace(
        /^(?:Here(?:'s| is)|Sure[!,]?|Certainly[!,]?|Of course[!,]?|(?:The\s+)?(?:Summary|Answer|Output|Result|Response))\s*[:!]?\s*/i,
        "",
      )
      // Remove trailing meta-commentary
      .replace(
        /\n+(?:Let me know|Hope this|Feel free|I(?:'ve| have) (?:rewritten|summarized|expanded|simplified|converted|fixed))[^\n]*/gi,
        "",
      )
      // Remove wrapping quotes (only if they wrap the ENTIRE output)
      .replace(/^"([\s\S]+)"$/, "$1")
      .trim()
  );
}

//  Main export
export async function performAIAction(
  content: string,
  action: AIAction,
): Promise<string> {
  if (!content?.trim()) throw new Error("Content is required");
  if (!(action in ACTION_INSTRUCTIONS))
    throw new Error(`Invalid action: ${action}`);

  // Cache key includes model + action + content
  const cacheKey = createHash("sha256")
    .update(`${MODEL_NAME}::${action}::${content}`)
    .digest("hex");

  const cached = responseCache.get(cacheKey);
  if (cached) return cached;

  try {
    const { text } = await generateText({
      model: groq(MODEL_NAME),
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `${ACTION_INSTRUCTIONS[action]}\n\n---\n\n${content}`,
        },
      ],
      temperature: ACTION_TEMPERATURE[action],
      maxOutputTokens: ACTION_MAX_TOKENS[action],
    });

    const output = cleanOutput(text ?? "");

    // If model returned empty or only whitespace, fall back to original
    const finalOutput = output.length > 0 ? output : content.trim();

    responseCache.set(cacheKey, finalOutput);
    return finalOutput;
  } catch (error) {
    console.error(`AI Error [${action}]:`, error);
    // Never throw to the UI — return original content on failure
    return content.trim();
  }
}
