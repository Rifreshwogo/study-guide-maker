import "server-only";
import {
  BOOKS,
  OPENSTAX_URL_MARKERS,
  pendingUrlPrefixes,
} from "@/sources.config";

/**
 * Checks on every URL the AI touched during research. This is the safety net
 * behind the domain filters given to the web tools: it catches pending books
 * reached on a shared host, OpenStax copies on unlisted sites, and made-up links.
 */

/** "host/decoded/path" in lowercase, without query, hash, or trailing slash. */
export function normalizeUrl(raw: string): string | null {
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    let path: string;
    try {
      path = decodeURIComponent(u.pathname);
    } catch {
      path = u.pathname;
    }
    const host = u.hostname.toLowerCase().replace(/^www\./, "");
    return `${host}${path}`.replace(/\/+$/, "").toLowerCase();
  } catch {
    return null;
  }
}

export function matchesPrefix(url: string, prefixes: string[]): boolean {
  const n = normalizeUrl(url);
  if (!n) return false;
  return prefixes.some((p) => {
    const np = normalizeUrl(p);
    return !!np && (n === np || n.startsWith(np + "/"));
  });
}

/** True if this URL looks like OpenStax content or a pending book, on any site. */
export function isBlockedUrl(url: string): boolean {
  // Pages of an approved book (including an approved OpenStax book) are allowed.
  const approved = Object.values(BOOKS)
    .filter((b) => b.status === "approved")
    .flatMap((b) => b.urlPrefixes);
  if (matchesPrefix(url, approved)) return false;
  const lower = url.toLowerCase();
  if (OPENSTAX_URL_MARKERS.some((m) => lower.includes(m))) return true;
  if (matchesPrefix(url, pendingUrlPrefixes())) return true;
  return false;
}

/** Keep only web sources that were really seen during research. */
export function filterWebSources<T extends { url: string }>(
  listed: T[],
  safeSites: { url: string }[],
): T[] {
  const allowed = new Set(safeSites.map((s) => normalizeUrl(s.url)).filter(Boolean));
  const out: T[] = [];
  const used = new Set<string>();
  for (const s of listed) {
    const n = normalizeUrl(s.url);
    if (n && allowed.has(n) && !used.has(n)) {
      used.add(n);
      out.push(s);
    }
  }
  return out;
}
