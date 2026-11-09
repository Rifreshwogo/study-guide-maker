import { NextResponse } from "next/server";
import { APP_CONFIG } from "@/app.config";
import { classForSubject } from "@/sources.config";
import { GenerateRequestSchema, type NoteImage } from "@/lib/request";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";
import { GenerationError } from "@/lib/errors";
import { enqueue } from "@/lib/jobs";
import { fromThisSite } from "@/lib/sameSite";
import type { GuideErrorResponse, QueuedResponse } from "@/lib/schema";

export const runtime = "nodejs";

function fail(status: number, error: string) {
  return NextResponse.json<GuideErrorResponse>({ error }, { status });
}

/** Checks the first bytes, so only real JPEG/PNG data reaches the models. */
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

/** Puts a study guide request in line. The page then checks /api/jobs/<id> for progress. */
export async function POST(req: Request) {
  if (process.env.VERCEL) return fail(503, "Study Guide Maker has moved to a new address.");
  if (!fromThisSite(req)) return fail(403, "This request isn't allowed.");

  // 1. Size check before reading the body.
  const length = Number(req.headers.get("content-length") ?? "0");
  if (length > APP_CONFIG.maxRequestBytes) return fail(413, "Those photos are too large. Try fewer photos.");

  let body: unknown;
  try {
    const text = await req.text();
    if (text.length > APP_CONFIG.maxRequestBytes) return fail(413, "Those photos are too large. Try fewer photos.");
    body = JSON.parse(text);
  } catch {
    return fail(400, "Something was wrong with that request. Please try again.");
  }

  // 2. Validate input.
  const parsed = GenerateRequestSchema.safeParse(body);
  if (!parsed.success) return fail(400, parsed.error.issues[0]?.message ?? "Please check your entries and try again.");
  const { subject, topic, images, today } = parsed.data;
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
        : "The site has hit its daily limit. Please try again tomorrow.",
    );
  }

  // 4. Get in line. Photos stay in memory only until the guide is made.
  try {
    const { id, position } = enqueue({ cls: classForSubject(subject), topic, images, today: safeToday(today) });
    return NextResponse.json<QueuedResponse>({ jobId: id, position }, { status: 202 });
  } catch (e) {
    if (e instanceof GenerationError) return fail(e.status, e.userMessage);
    console.error("enqueue error:", e instanceof Error ? e.name : typeof e);
    return fail(500, "Something went wrong. Please try again.");
  }
}
