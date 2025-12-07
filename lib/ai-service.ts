import { createHash } from "node:crypto";
import { LRUCache } from "lru-cache";
import { AIAction } from "./types";
import { groq } from "@ai-sdk/groq";
import { generateText } from "ai";

const PROMPTS: Record<AIAction, string> = {
  summarize:
    "Summarize this content. If unclear or unintelligible, return the original unchanged. Output only markdown:\n\n{content}",

  rewrite:
    "Rewrite for clarity. If unclear or unintelligible, return the original unchanged. Output only markdown:\n\n{content}",

  grammar:
    "Fix grammar and spelling. If unclear or unintelligible, return the original unchanged. Output only markdown:\n\n{content}",

  expand:
    "Expand with more detail. If unclear or unintelligible, return the original unchanged. Output only markdown:\n\n{content}",

  simplify:
    "Simplify this content. If unclear or unintelligible, return the original unchanged. Output only markdown:\n\n{content}",

  ask: `Return only the direct answer from the given notes. Do math if needed.
  If not answerable, reply rudely with slangs and an ASCII angry face.
  No preamble or extra text:{content}`,

  todo: "Convert content context to a markdown checklist. If unclear or not convertible, return the original unchanged:\n\n{content}",

  prompt:
    "Parse text and detect inline instructions inside /[...]. Apply each instruction to the referenced content. For Q&A, keep both question and answer; expand answers for detailed ones. Be concise for large outputs. Output only markdown,just corrected text, no explanations:{content}",
};

// Cache responses for 1 hour
const responseCache = new LRUCache<string, string>({
  max: 500,
  ttl: 60 * 60 * 1000,
});

// model
const MODEL_NAME = process.env.GENAI_MODEL ?? "llama-3.1-8b-instant";

// Clean up AI output
function cleanOutput(text: string): string {
  if (!text) return "";
  return text
    .trim()
    .replace(/^```[\s\S]*?\n/, "")
    .replace(/```$/m, "")
    .replace(/^["'`]+|["'`]+$/g, "")
    .replace(/^(here(?:'s| is)|answer|response|output):\s*/i, "")
    .trim();
}

// Main function
export async function performAIAction(
  content: string,
  action: AIAction,
): Promise<string> {
  if (!content.trim()) throw new Error("Content is required");
  if (!(action in PROMPTS)) throw new Error(`Invalid action: ${action}`);

  const prompt = PROMPTS[action].replace("{content}", content);

  const cacheKey = createHash("sha256")
    .update([MODEL_NAME, action, prompt].join("::"))
    .digest("hex");

  const cached = responseCache.get(cacheKey);
  if (cached) return cached;

  const { text } = await generateText({
    model: groq(MODEL_NAME),
    prompt: prompt,
  });
  const output = cleanOutput(text || "");

  responseCache.set(cacheKey, output || content.trim());
  return output || content.trim();
}
