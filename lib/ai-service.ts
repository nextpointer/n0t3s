import { createHash } from "node:crypto";
import { LRUCache } from "lru-cache";
import { AIAction } from "./types";
import { groq } from "@ai-sdk/groq";
import { generateText } from "ai";

const SYSTEM_PROMPT = `You are a precise markdown text processing tool. STRICT RULES:
1. Output ONLY valid markdown content - NO OTHER TEXT
2. NO code blocks, NO headers, NO explanations, NO chit-chat
3. NO phrases like "Here's", "Summary:", "Answer:", "Output:", "Response:"
4. If content is unclear, empty, or gibberish → return EXACTLY unchanged
5. For grammar/todo/summarize → pure markdown only, no introductions`;

const ACTION_INSTRUCTIONS: Record<AIAction, string> = {
  summarize: "Create a concise bullet-point summary",
  rewrite: "Rewrite for maximum clarity and readability",
  grammar: "Fix ONLY grammar and spelling errors",
  expand: "Expand with relevant details while preserving original meaning",
  simplify: "Simplify to 5th-grade reading level, short sentences",
  ask: "Extract only the direct answer. Do math if needed. If unanswerable: reply 'WTF NO ANSWER >:('",
  todo: "Convert to markdown checklist format with - [ ] checkboxes",
  prompt:
    "Parse /[...] instructions, apply to referenced content, output corrected markdown only",
};

// Cache responses for 1 hour
const responseCache = new LRUCache<string, string>({
  max: 500,
  ttl: 60 * 60 * 1000,
});

// model
const MODEL_NAME = process.env.GENAI_MODEL ?? "llama-3.3-70b-versatile";

// Clean up AI output
function cleanOutput(text: string): string {
  if (!text) return "";
  return (
    text
      .trim()
      // Remove all code blocks
      .replace(/^```(?:markdown|md)?\s*[\r\n]|```$/gm, "")
      // Kill common chit-chat prefixes
      .replace(
        /^(?:Here's|Here is|Summary|Answer|Output|Response|Result)[:\s\w.!?]+/i,
        "",
      )
      // Remove leading/trailing quotes
      .replace(/^["'`]+|["'`]+$/g, "")
      // Clean up extra whitespace
      .replace(/^\s*[-*]\s*/, "")
      .trim()
  );
}

// Main function
export async function performAIAction(
  content: string,
  action: AIAction,
): Promise<string> {
  if (!content?.trim()) throw new Error("Content is required");
  if (!(action in ACTION_INSTRUCTIONS))
    throw new Error(`Invalid action: ${action}`);

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
          content: `${ACTION_INSTRUCTIONS[action]}:\n\n${content}`,
        },
      ],
      temperature: 0.1,
    });

    const output = cleanOutput(text || "");
    const finalOutput = output || content.trim();

    responseCache.set(cacheKey, finalOutput);
    return finalOutput;
  } catch (error) {
    console.error(`AI Error for ${action}:`, error);
    return content.trim();
  }
}
