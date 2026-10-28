import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { APP_CONFIG } from "@/app.config";
import { getClass } from "@/sources.config";
import { GenerateRequestSchema, type NoteImage } from "@/lib/request";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";
import { GenerationError, generateGuide } from "@/lib/generate";
import type { GuideErrorResponse, GuideResponse } from "@/lib/schema";

export const runtime = "nodejs";
// Research + writing can take a couple of minutes. 300s is the Vercel Hobby maximum.
export const maxDuration = 300;

function fail(status: number, error: string) {
  return NextResponse.json<GuideErrorResponse>({ error }, { status });
}

/** Checks the first bytes, so only real JPEG/PNG data reaches the API. */
function looksLikeImage(img: NoteImage): boolean {
  const head = Buffer.from(img.data.slice(0, 16), "base64");
  if (img.mediaType === "image/jpeg") return head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;
  return head.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
}

/** Accept the student's date only if it's within a day or two of the server's. */
function safeToday(date: string): string {
  const server = new Date();
  const theirs = new Date(`${date}T12:00:00Z`);
  const days = Math.abs(theirs.getTime() - server.getTime()) / 86_400_000;
  return Number.isFinite(days) && days <= 2 ? date : server.toISOString().slice(0, 10);
}

/**
 * Only accept JSON requests from this app's own pages. This stops other websites
 * from using the API (and your bill) from their visitors' browsers.
 */
function fromThisSite(req: Request): boolean {
  const type = req.headers.get("content-type") ?? "";
  if (!type.toLowerCase().startsWith("application/json")) return false;
  const origin = req.headers.get("origin");
  if (!origin) return true; // same-origin fetches may omit it; non-browser clients are rate limited
  try {
    return new URL(origin).host === (req.headers.get("x-forwarded-host") ?? req.headers.get("host"));
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  if (!fromThisSite(req)) return fail(403, "This request isn't allowed.");

  // 1. Size check before reading the body.
  const length = Number(req.headers.get("content-length") ?? "0");
  if (length > APP_CONFIG.maxRequestBytes) {
    return fail(413, "Those photos are too large. Try fewer photos.");
  }

  let body: unknown;
  try {
    const text = await req.text();
    if (text.length > APP_CONFIG.maxRequestBytes) {
      return fail(413, "Those photos are too large. Try fewer photos.");
    }
    body = JSON.parse(text);
  } catch {
    return fail(400, "Something was wrong with that request. Please try again.");
  }

  // 2. Validate input.
  const parsed = GenerateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return fail(400, parsed.error.issues[0]?.message ?? "Please check your entries and try again.");
  }
  const { classId, topic, images, today } = parsed.data;
  const cls = getClass(classId);
  if (!cls) return fail(400, "Please pick your class.");
  if (!images.every(looksLikeImage)) {
    return fail(400, "One of the photos couldn't be read. Try removing it and adding it again.");
  }

  // 3. Rate limit (counted only for valid requests).
  const limit = await checkRateLimit(clientIp(req.headers));
  if (!limit.ok) {
    return fail(
      429,
      limit.reason === "ip"
        ? `You've made ${APP_CONFIG.rateLimitPerHour} guides this hour. Take a study break and try again later!`
        : "The app has hit its daily limit. Please try again tomorrow.",
    );
  }

  // 4. Generate. Photos stay in memory for this request only and are never saved.
  try {
    const result = await generateGuide({ cls, topic, images, today: safeToday(today) });
    return NextResponse.json<GuideResponse>(result);
  } catch (e) {
    // Log only error type/status: never the student's text or photos.
    if (e instanceof GenerationError) {
      console.error("generation error:", e.message);
      return fail(e.status, e.userMessage);
    }
    if (e instanceof Anthropic.RateLimitError) {
      console.error("anthropic rate limit");
      return fail(503, "Lots of students are studying right now. Please try again in a minute.");
    }
    if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError) {
      console.error("anthropic auth error", e.status);
      return fail(500, "The app isn't set up correctly. Please try again later.");
    }
    if (e instanceof Anthropic.APIConnectionTimeoutError || e instanceof Anthropic.APIConnectionError) {
      console.error("anthropic connection error");
      return fail(504, "That took too long. Please try again, maybe with a narrower topic.");
    }
    if (e instanceof Anthropic.APIError) {
      console.error("anthropic api error", e.status);
      return fail(502, "The study guide service is having trouble. Please try again in a minute.");
    }
    console.error("unexpected error:", e instanceof Error ? e.name : typeof e);
    return fail(500, "Something went wrong making your guide. Please try again.");
  }
}
