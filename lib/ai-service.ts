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
  | "ask"
  | "todo";

// Prompts per action
const PROMPTS: Record<AIAction, string> = {
  summarize:
    "Return only the summary in 2–3 sentences. No extra text. If summarization is not possible, return the original text:\n{content}",
  rewrite:
    "Return only the rewritten version. No explanations. If rewriting is not possible, return the original text:\n{content}",
  grammar:
    "Return only the corrected text. No explanations, no multiple options. If correction is not possible, return the original text:\n{content}",
  expand:
    "Return only the expanded version with helpful details. No extra text. If expansion is not possible, return the original text:\n{content}",
  simplify:
    "Return only the simplified version for easy understanding. No extra text. If simplification is not possible, return the original text:\n{content}",
  ask: `Return only the direct answer. No preamble, no extra text.
You can also perform:
- Math calculations
- Date and time calculations (use google searched value for current date and time)
If a direct answer is not possible, show some rudeness and say some slangs like u are very angry and create angry face with ascii art`,
  todo: `Convert the following text into a clean plain-text todo list.
- Each todo must start with "- " (bullet point) and end with [ ], if any todo is checked it should be checked
- Keep it short and clear.
If it cannot be converted into a todo list, just return the text as it is, without saying anything extra:\n{content}`,
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
