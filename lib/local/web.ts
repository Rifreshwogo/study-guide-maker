import "server-only";
import { LOCAL_CONFIG } from "./config";
import { OPENSTAX_MIRROR_DOMAINS } from "@/sources.config";
import { isBlockedUrl, normalizeUrl } from "@/lib/sourceCheck";
import { recordSiteCheck } from "./status";

/**
 * Web access for local mode. Unlike Claude's web tools, here the server does the
 * searching and page reading itself, so every result passes the same OpenStax
 * checks BEFORE any model sees it.
 */

export interface WebPage {
  title: string;
  url: string;
  text: string;
}

const USER_AGENT = "StudyGuideApp/1.0 (free educational study-guide generator)";

function isMirrorHost(host: string): boolean {
  return OPENSTAX_MIRROR_DOMAINS.some((d) => host === d || host.endsWith("." + d));
}

/** Public http(s) URLs only: never this Mac or the local network. */
export function isPublicWebUrl(raw: string): boolean {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return false;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return false;
  const h = u.hostname.toLowerCase();
  if (h === "localhost" || h.endsWith(".local") || h.endsWith(".internal") || !h.includes(".")) return false;
  if (/^\d+\.\d+\.\d+\.\d+$/.test(h) || h.includes(":")) return false; // raw IPs (v4/v6)
  return true;
}

/**
 * Sites that make poor study sources: videos and social media (little readable text),
 * Q&A forums, and homework-answer sites.
 */
const LOW_VALUE_HOSTS = [
  "youtube.com", "youtu.be", "tiktok.com", "instagram.com", "facebook.com", "x.com", "twitter.com",
  "pinterest.com", "reddit.com", "quora.com", "chegg.com", "brainly.com", "coursehero.com",
  "studocu.com", "quizlet.com", "scribd.com", "slideshare.net",
];
const isLowValue = (host: string) => LOW_VALUE_HOSTS.some((d) => host === d || host.endsWith("." + d));

/** Why a page is off-limits for the local team, or null if it's fine. */
export function blockReason(url: string): string | null {
  if (!isPublicWebUrl(url)) return "Not a public web address";
  const host = new URL(url).hostname.toLowerCase();
  if (isBlockedUrl(url)) return "OpenStax or a book not approved yet";
  if (isMirrorHost(host)) return "Copy of an OpenStax book";
  if (isLowValue(host)) return "Video, social or homework-answer site";
  return null;
}

/** Safe to show the local team: public, a decent source, not OpenStax, not a mirror, not a pending book. */
export function allowedForLocal(url: string): boolean {
  return blockReason(url) === null;
}

export async function searchWeb(query: string): Promise<{ title: string; url: string; snippet: string }[]> {
  const url = `${LOCAL_CONFIG.searxngUrl}/search?format=json&safesearch=2&q=${encodeURIComponent(query)}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(20_000), cache: "no-store" });
    if (!res.ok) return [];
    const data = (await res.json()) as { results?: { title?: string; url?: string; content?: string }[] };
    return (data.results ?? [])
      .filter((r) => {
        if (!r.url) return false;
        // Search results that are off-limits count as blocked checks (they're never downloaded).
        const reason = blockReason(r.url);
        if (reason) recordSiteCheck(r.url, reason);
        return !reason;
      })
      .map((r) => ({ title: r.title ?? r.url!, url: r.url!, snippet: r.content ?? "" }));
  } catch {
    console.warn("local search: SearXNG unreachable");
    return [];
  }
}

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

/** Rough readable text from HTML: drops scripts, menus, headers, footers. */
export function htmlToText(html: string): { title: string; text: string } {
  const title = decodeEntities(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "").trim();
  // Pages often have several <main>/<article> blocks, and the first can be a tiny
  // menu (LibreTexts' first <main> just says "This action is not available").
  // Try each likely content block and keep the one with the most text.
  const blocks = [
    ...(html.match(/<main\b[\s\S]*?<\/main>/gi) ?? []),
    ...(html.match(/<article\b[\s\S]*?<\/article>/gi) ?? []),
  ];
  // LibreTexts' chapter text: the element with that class (not the CSS that mentions it).
  const lt = html.search(/<[a-z]+\b[^>]*class="[^"]*\bmt-content-container\b/i);
  if (lt >= 0) blocks.push(html.slice(lt, lt + 400_000));
  const texts = blocks.map(blockToText).filter((t) => t.length >= 200);
  const text = texts.length ? texts.reduce((a, b) => (b.length > a.length ? b : a)) : blockToText(html);
  return { title, text };
}

function blockToText(block: string): string {
  const body = block
    .replace(/<(script|style|noscript|svg|nav|header|footer|aside|form)\b[\s\S]*?<\/\1>/gi, " ")
    .replace(/<\/(p|div|li|h[1-6]|tr|section|br)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ");
  return decodeEntities(body)
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
}

/** Downloads a page and returns its text, or null if it's off-limits or unreadable. */
export async function readPage(
  url: string,
  fallbackTitle = "",
  /** Which URLs may be read. Defaults to the web rules; textbook pages pass their own. */
  allow: (url: string) => boolean = allowedForLocal,
): Promise<WebPage | null> {
  if (!isPublicWebUrl(url) || !allow(url)) {
    recordSiteCheck(url, isPublicWebUrl(url) ? (blockReason(url) ?? "Outside the approved textbook") : "Not a public web address");
    return null;
  }
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
      signal: AbortSignal.timeout(12_000),
      redirect: "follow",
      cache: "no-store",
    });
    // A redirect can land somewhere else; check the final address too.
    if (res.url && res.url !== url && (!isPublicWebUrl(res.url) || !allow(res.url))) {
      recordSiteCheck(url, "Redirected to an off-limits page");
      return null;
    }
    recordSiteCheck(url, null);
    if (!res.ok) return null;
    if (!(res.headers.get("content-type") ?? "").includes("html")) return null;
    const html = (await res.text()).slice(0, 2_000_000);
    const { title, text } = htmlToText(html);
    if (text.length < 200) return null;
    return {
      title: title || fallbackTitle || url,
      url: res.url || url,
      text: text.slice(0, LOCAL_CONFIG.maxPageChars),
    };
  } catch {
    return null;
  }
}

export function sameUrl(a: string, b: string): boolean {
  const na = normalizeUrl(a);
  return !!na && na === normalizeUrl(b);
}
