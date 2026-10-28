import "server-only";
import type { Book } from "@/sources.config";
import { matchesPrefix, normalizeUrl } from "@/lib/sourceCheck";

/**
 * Builds a short list of chapter/section links for an approved book, by
 * downloading the book's own contents pages (no AI involved, so it costs
 * nothing). The AI gets this list and opens only the 1–3 sections it needs,
 * instead of reading a huge contents page itself.
 *
 * Only links inside the book's configured prefix are kept. Results are cached
 * for a day in memory and in Next's fetch cache.
 */

export interface SectionLink {
  title: string;
  url: string;
  chapter?: string;
}

const USER_AGENT = "StudyGuideApp/1.0 (free educational study-guide generator)";
const TIMEOUT_MS = 8000;
const MAX_HTML_BYTES = 3_000_000;
const MAX_CHAPTERS = 30;
const MAX_LINKS = 200;
const DAY_MS = 86_400_000;

const cache = new Map<string, { links: SectionLink[]; expires: number }>();
const inFlight = new Map<string, Promise<SectionLink[]>>();

async function fetchHtml(url: string, prefix: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;
    // Ignore redirects that leave the book's own pages.
    if (res.url && !matchesPrefix(res.url, [prefix])) return null;
    const html = await res.text();
    return html.length > MAX_HTML_BYTES ? html.slice(0, MAX_HTML_BYTES) : html;
  } catch {
    return null;
  }
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

/** "5.02%3A_The_Budget_Process" → "5.02: The Budget Process" */
function titleFromUrl(url: string): string {
  const last = new URL(url).pathname.split("/").filter(Boolean).pop() ?? url;
  let t = last;
  try {
    t = decodeURIComponent(last);
  } catch {}
  return t.replace(/_/g, " ").replace(/-/g, " ").replace(/\s+/g, " ").trim();
}

function extractLinks(html: string, baseUrl: string, prefix: string): SectionLink[] {
  const out: SectionLink[] = [];
  const seen = new Set<string>();
  const re = /<a\b[^>]*?href\s*=\s*["']([^"'#]+)[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    let url: string;
    try {
      const u = new URL(decodeEntities(m[1]), baseUrl);
      u.hash = "";
      u.search = "";
      url = u.toString();
    } catch {
      continue;
    }
    if (!matchesPrefix(url, [prefix])) continue;
    const key = normalizeUrl(url);
    if (!key || key === normalizeUrl(prefix) || seen.has(key)) continue;
    seen.add(key);
    const text = decodeEntities(m[2].replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
    out.push({ title: text.length >= 3 && text.length <= 150 ? text : titleFromUrl(url), url });
  }
  return out;
}

/** True for front/back matter and reference-list pages that never help a study guide. */
function isBoilerplate(url: string): boolean {
  let u = url;
  try {
    u = decodeURIComponent(url);
  } catch {}
  return /(front|back)[_ %-]?matter|detailed[_ -]licensing|index$|glossary$|[_ :]references$|works[_ ]cited$/i.test(u);
}

async function buildIndex(book: Book): Promise<SectionLink[]> {
  const idx = book.index!;
  const html = await fetchHtml(idx.url, idx.url);
  if (!html) return [];
  const top = extractLinks(html, idx.url, idx.linkPrefix).filter((l) => !isBoilerplate(l.url));

  if (idx.depth === 1) return top.slice(0, MAX_LINKS);

  // Depth 2: open each chapter page (4 at a time) and list its sections.
  const chapters = top.slice(0, MAX_CHAPTERS);
  const results: SectionLink[][] = new Array(chapters.length);
  let next = 0;
  async function worker() {
    while (next < chapters.length) {
      const i = next++;
      const ch = chapters[i];
      const chHtml = await fetchHtml(ch.url, idx.linkPrefix);
      const sections = chHtml
        ? extractLinks(chHtml, ch.url, ch.url).filter((l) => !isBoilerplate(l.url))
        : [];
      // If a chapter's sections can't be read, list the chapter page itself.
      results[i] = sections.length
        ? sections.map((s) => ({ ...s, chapter: ch.title }))
        : [{ ...ch }];
    }
  }
  await Promise.all([worker(), worker(), worker(), worker()]);
  return results.flat().slice(0, MAX_LINKS);
}

/** Section links for a book, or [] if it has no index or the site couldn't be read. */
export async function getSectionLinks(book: Book): Promise<SectionLink[]> {
  if (!book.index) return [];
  const hit = cache.get(book.id);
  if (hit && hit.expires > Date.now()) return hit.links;

  let p = inFlight.get(book.id);
  if (!p) {
    p = buildIndex(book).finally(() => inFlight.delete(book.id));
    inFlight.set(book.id, p);
  }
  const links = await p;
  // Cache failures for 10 minutes only, so a temporary outage doesn't stick.
  cache.set(book.id, { links, expires: Date.now() + (links.length ? DAY_MS : 600_000) });
  return links;
}

/** Plain-text list for the prompt, grouped by chapter. */
export function formatSectionLinks(links: SectionLink[]): string {
  const lines: string[] = [];
  let current: string | undefined;
  for (const l of links) {
    if (l.chapter && l.chapter !== current) {
      current = l.chapter;
      lines.push(`  ${l.chapter}`);
    }
    lines.push(`${l.chapter ? "    " : "  "}- ${l.title}: ${l.url}`);
  }
  return lines.join("\n");
}
