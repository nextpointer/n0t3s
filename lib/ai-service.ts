import { GoogleGenerativeAI } from "@google/generative-ai";
import { createHash } from "node:crypto";
import { LRUCache } from "lru-cache";

// Supported actions
export type AIAction =
  | "summarize"
  | "rewrite"
  | "grammar"
  | "expand"
  | "simplify"
  | "ask";

// Prompts per action
const PROMPTS: Record<AIAction, string> = {
  summarize:
    "Return only the summary in 2–3 sentences. No extra text:\n{content}",
  rewrite: "Return only the rewritten version. No explanations:\n{content}",
  grammar:
    "Return only the corrected text. No explanations, no multiple options:\n{content}",
  expand:
    "Return only the expanded version with helpful details. No extra text:\n{content}",
  simplify:
    "Return only the simplified version for easy understanding. No extra text:\n{content}",
  ask: "Return only the direct answer. No preamble, no extra text:\n{content}",
};

// Cache responses for 1 hour
const responseCache = new LRUCache<string, string>({
  max: 500,
  ttl: 60 * 60 * 1000,
});

// Gemini setup
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const MODEL_NAME = process.env.GOOGLE_GENAI_MODEL ?? "gemini-2.5-flash-lite";

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

  const model = genAI.getGenerativeModel({ model: MODEL_NAME });
  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = cleanOutput(response.text() || "");

  responseCache.set(cacheKey, text || content.trim());
  return text || content.trim();
}
