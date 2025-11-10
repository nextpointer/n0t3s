import { GoogleGenerativeAI } from "@google/generative-ai";
import { createHash } from "node:crypto";
import { LRUCache } from "lru-cache";
import { AIAction } from "./types";

const PROMPTS: Record<AIAction, string> = {
  summarize: "Summarize in markdown or return original:\n{content}",
  rewrite: "Rewrite in markdown or return original:\n{content}",
  grammar: "Fix grammar in markdown or return original:\n{content}",
  expand: "Expand in markdown or return original:\n{content}",
  simplify: "Simplify in markdown or return original:\n{content}",
  ask: "Plain answer based on notes or be rude:\n{content}",
  todo: "Convert to:\n- [ ] task\n- [x] done\nOr return original:\n{content}",
};

// Cache responses for 1 hour
const responseCache = new LRUCache<string, string>({
  max: 500,
  ttl: 60 * 60 * 1000,
});

// Gemini setup
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const MODEL_NAME = process.env.GOOGLE_GENAI_MODEL ?? "gemini-2.5-flash";

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
