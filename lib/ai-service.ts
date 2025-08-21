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
  ask: `Return only the direct answer, strictly based on the given notes context.
    - You can also perform math calculations if relevant.
    If a direct answer is not possible within the context of the notes, respond with rudeness:
    - Use slangs as if you are very angry.
    - Add an angry face made with ASCII art.
    Do not add any preamble or extra explanation:\n{content}`,
  todo: `Convert the following text into a clean plain-text (don't use markdown syntax) todo list.
    - Each todo must start with "- " (bullet point) and end with [ ].
    - If a todo is marked as checked or there is any indication it is done, always keep it as done [x].
    - Keep it short and clear.
    - If any date is mentioned, group todos under that date as a heading (e.g., "22aug").
    - Always sort the date groups in descending order (latest/newest date at the top).
    - Add a clear separator (e.g., "-----") and some blank lines between different date sections for readability.
    - Always leave 2–3 blank lines between the todo list of a date and its "experiences:" section for better readability.
    - After the todo list for each date, always add a section called "experiences:" where the user can write about experiences, remaining tasks, or anything else. Keep this section even if it's empty.
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
