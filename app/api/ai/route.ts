import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { performAIAction } from "@/lib/ai-service";
import { type AIAction } from "@/lib/types";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Redis + Rate Limit
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.fixedWindow(20, "5 m"), // 5 requests / 5 min per IP
});

// Extract client IP
function getClientIP(req: NextRequest): string {
  const xf = req.headers.get("x-forwarded-for");
  return xf ? xf.split(",")[0]!.trim() : "anonymous";
}

// API route
export async function POST(req: NextRequest) {
  if (!req.headers.get("content-type")?.includes("application/json")) {
    return NextResponse.json(
      { error: "Invalid Content-Type" },
      { status: 400 },
    );
  }

  const ip = getClientIP(req);

  try {
    const body = await req.json();
    const content = (body?.content ?? "").toString();
    const action = (body?.action ?? "").toString() as AIAction;
    const instruction = (body?.instruction ?? "").toString();
    const noteContext = (body?.noteContext ?? "").toString();

    const MAX_CONTENT = 200_000;
    const MAX_INSTRUCTION = 4_000;
    const MAX_NOTE_CONTEXT = 300_000;
    if (content.length > MAX_CONTENT || noteContext.length > MAX_NOTE_CONTEXT || instruction.length > MAX_INSTRUCTION) {
      return NextResponse.json({ error: "Request too large" }, { status: 413 });
    }

    if (!action) {
      return NextResponse.json({ error: "Missing action" }, { status: 400 });
    }
    if (!content.trim()) {
      return NextResponse.json({ error: "Not able to edit" }, { status: 400 });
    }
    if (action === "edit" && !instruction.trim()) {
      return NextResponse.json(
        { error: "Missing instruction" },
        { status: 400 },
      );
    }

    // Rate limit
    const rl = await ratelimit.limit(ip);
    const headers = {
      "X-RateLimit-Limit": String(rl.limit),
      "X-RateLimit-Remaining": String(rl.remaining),
      "X-RateLimit-Reset": String(rl.reset),
    };

    if (!rl.success) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Try again 3-4 min later." },
        { status: 429, headers },
      );
    }

    // Run AI action
    const result = await performAIAction(content, action, instruction, { noteContext });
    return NextResponse.json({ result }, { headers });
  } catch (err) {
    console.error("AI API Error:", err);
    const message =
      err && typeof err === "object" && "message" in err
        ? String((err as { message?: unknown }).message || "")
        : "";
    return NextResponse.json(
      {
        error:
          message && /not able to edit|model|api key|took too long/i.test(message)
            ? message
            : "AI service is currently unavailable. Please try again later.",
      },
      { status: 500 },
    );
  }
}
