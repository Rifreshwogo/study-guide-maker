import "server-only";
import {
  BOOKS,
  OPENSTAX_MIRROR_DOMAINS,
  OPENSTAX_URL_MARKERS,
  approvedBooks,
  pendingUrlPrefixes,
  type Book,
  type ClassConfig,
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

function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function isMirrorHost(host: string): boolean {
  return OPENSTAX_MIRROR_DOMAINS.some((d) => host === d || host.endsWith("." + d));
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

export interface SeenUrls {
  fetched: string[];
  searched: { url: string; title: string }[];
}

export interface CheckResult {
  ok: boolean;
  /** Hostnames to add to the search blocklist before retrying. */
  badHosts: string[];
  /** The exact off-limits URLs, so the retry can tell the AI to avoid them. */
  badUrls: string[];
  /** Approved books whose pages were actually fetched. */
  booksUsed: Book[];
  /** Search results that are safe to list as sources. */
  safeSites: { url: string; title: string }[];
}

export function checkResearch(cls: ClassConfig, seen: SeenUrls): CheckResult {
  const books = approvedBooks(cls);
  const badHosts = new Set<string>();
  const badUrls = new Set<string>();
  const booksUsed = new Map<string, Book>();

  for (const url of seen.fetched) {
    const book = books.find((b) => matchesPrefix(url, b.urlPrefixes));
    // Fetches must land inside an approved book of THIS class, and not a blocked page.
    if (!book || isBlockedUrl(url)) {
      const h = hostOf(url);
      if (h) badHosts.add(h);
      badUrls.add(url);
      continue;
    }
    booksUsed.set(book.id, book);
  }

  const safeSites: { url: string; title: string }[] = [];
  for (const s of seen.searched) {
    const h = hostOf(s.url);
    if (!h) continue;
    // A search hit inside an approved book counts as using that book; it's
    // credited in the book attribution, not listed again as a website.
    const book = books.find((b) => matchesPrefix(s.url, b.urlPrefixes));
    if (book && !isBlockedUrl(s.url)) {
      booksUsed.set(book.id, book);
      continue;
    }
    if (isBlockedUrl(s.url) || isMirrorHost(h)) {
      badHosts.add(h);
      badUrls.add(s.url);
      continue;
    }
    safeSites.push(s);
  }

  return {
    ok: badHosts.size === 0,
    badHosts: [...badHosts],
    badUrls: [...badUrls],
    booksUsed: [...booksUsed.values()],
    safeSites: dedupe(safeSites),
  };
}

function dedupe(sites: { url: string; title: string }[]) {
  const seen = new Set<string>();
  return sites.filter((s) => {
    const n = normalizeUrl(s.url);
    if (!n || seen.has(n)) return false;
    seen.add(n);
    return true;
  });
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
