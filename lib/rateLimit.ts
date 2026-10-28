import "server-only";
import { createHash } from "node:crypto";
import { APP_CONFIG } from "@/app.config";

/**
 * Rate limiting: a per-IP hourly limit plus an app-wide daily limit.
 *
 * With UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN set, counts are kept
 * in Upstash Redis and shared by every Vercel server. Without them, counts are
 * kept in this server's memory. That's fine locally, but on Vercel each server
 * instance counts separately, so set up Upstash before going live.
 *
 * IP addresses are hashed before storage; raw IPs are never stored.
 */

export type LimitResult = { ok: true } | { ok: false; reason: "ip" | "global" };

const HOUR = 3600;
const DAY = 86400;

function hashIp(ip: string): string {
  return createHash("sha256").update(`study-guide:${ip}`).digest("hex").slice(0, 32);
}

// ─── Upstash (REST API, no extra package needed) ───────────────────────────

async function upstashIncr(keys: { key: string; ttl: number }[]): Promise<number[]> {
  const url = process.env.UPSTASH_REDIS_REST_URL!;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN!;
  const commands = keys.flatMap(({ key, ttl }) => [
    ["INCR", key],
    ["EXPIRE", key, String(ttl), "NX"],
  ]);
  const res = await fetch(`${url.replace(/\/$/, "")}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(commands),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Upstash ${res.status}`);
  const out = (await res.json()) as { result?: unknown; error?: string }[];
  // Results alternate INCR, EXPIRE; take the INCR values.
  return keys.map((_, i) => {
    const r = out[i * 2];
    if (!r || r.error || typeof r.result !== "number") throw new Error("Upstash bad reply");
    return r.result;
  });
}

// ─── In-memory fallback ────────────────────────────────────────────────────

const memory = new Map<string, { count: number; expires: number }>();

function memoryIncr(keys: { key: string; ttl: number }[]): number[] {
  const now = Date.now();
  if (memory.size > 10_000) {
    for (const [k, v] of memory) if (v.expires <= now) memory.delete(k);
  }
  return keys.map(({ key, ttl }) => {
    const entry = memory.get(key);
    if (!entry || entry.expires <= now) {
      memory.set(key, { count: 1, expires: now + ttl * 1000 });
      return 1;
    }
    entry.count += 1;
    return entry.count;
  });
}

// ─── Public ─────────────────────────────────────────────────────────────────

export function usingSharedStore(): boolean {
  return !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

/** Counts one generation attempt and says whether it's allowed. */
export async function checkRateLimit(ip: string): Promise<LimitResult> {
  const now = Math.floor(Date.now() / 1000);
  const keys = [
    { key: `rl:ip:${hashIp(ip)}:${Math.floor(now / HOUR)}`, ttl: HOUR },
    { key: `rl:global:${Math.floor(now / DAY)}`, ttl: DAY },
  ];

  let counts: number[];
  if (usingSharedStore()) {
    try {
      counts = await upstashIncr(keys);
    } catch (e) {
      // If Upstash is down, fall back to memory instead of blocking everyone.
      console.error("rate limit store error:", e instanceof Error ? e.message : e);
      counts = memoryIncr(keys);
    }
  } else {
    counts = memoryIncr(keys);
  }

  if (counts[0] > APP_CONFIG.rateLimitPerHour) return { ok: false, reason: "ip" };
  if (counts[1] > APP_CONFIG.globalDailyLimit) return { ok: false, reason: "global" };
  return { ok: true };
}

/** The visitor's IP, as reported by Vercel (or "local" in development). */
export function clientIp(headers: Headers): string {
  // On Vercel, x-forwarded-for is set by the platform; the first entry is the client.
  const fwd = headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return headers.get("x-real-ip") ?? "local";
}
