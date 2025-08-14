import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { performAIAction, type AIAction } from "@/lib/ai-service";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Redis + Rate Limit
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.fixedWindow(10, "5 m"), // 10 requests / 5 min per IP
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

    if (!content.trim() || !action) {
      return NextResponse.json(
        { error: "Missing content or action" },
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
        { error: "Rate limit exceeded. Try again later." },
        { status: 429, headers },
      );
    }

    // Run AI action
    const result = await performAIAction(content, action);
    return NextResponse.json({ result }, { headers });
  } catch (err) {
    console.error("AI API Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
