import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { APP_CONFIG } from "@/app.config";
import {
  approvedBooks,
  searchBlockedDomains,
  type ClassConfig,
} from "@/sources.config";
import type { NoteImage } from "@/lib/request";
import { StudyGuideSchema, type BookAttribution, type GuideResponse } from "@/lib/schema";
import {
  composeSystemPrompt,
  composeUserText,
  researchSystemPrompt,
  researchUserText,
} from "@/lib/prompt";
import { checkResearch, filterWebSources, type SeenUrls } from "@/lib/sourceCheck";
import { formatSectionLinks, getSectionLinks } from "@/lib/bookIndex";
import type { BookLinks } from "@/lib/prompt";

/** An error with a message that's safe and friendly to show a student. */
export class GenerationError extends Error {
  constructor(
    public userMessage: string,
    public status = 500,
    detail?: string,
  ) {
    super(detail ?? userMessage);
  }
}

// Reads ANTHROPIC_API_KEY from the server environment. Never sent to the browser.
let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new GenerationError("The app isn't set up yet (missing API key).", 500, "ANTHROPIC_API_KEY not set");
  }
  client ??= new Anthropic({ maxRetries: 2, timeout: 240_000 });
  return client;
}

/**
 * If Claude declines a request, the API retries it on a fallback model chosen
 * by refusal category ("default" mode). Claude API only.
 */
const FALLBACK = {
  betas: ["server-side-fallback-2026-07-01"],
  fallbacks: "default" as const,
};

const MAX_CONTINUATIONS = 3;

/** Logs token counts only (never content) so you can watch cost in Vercel logs. */
function logUsage(step: string, usage: Anthropic.Beta.BetaUsage) {
  console.log(
    `usage ${step}: in=${usage.input_tokens} cacheRead=${usage.cache_read_input_tokens ?? 0}` +
      ` cacheWrite=${usage.cache_creation_input_tokens ?? 0} out=${usage.output_tokens}` +
      ` searches=${usage.server_tool_use?.web_search_requests ?? 0}` +
      ` fetches=${usage.server_tool_use?.web_fetch_requests ?? 0}`,
  );
}
const MAX_BLOCKLIST = 64; // API limit per domain list

function imageBlocks(images: NoteImage[]): Anthropic.Beta.BetaImageBlockParam[] {
  return images.map((img) => ({
    type: "image",
    source: { type: "base64", media_type: img.mediaType, data: img.data },
  }));
}

// ─── Step 1: research ───────────────────────────────────────────────────────

interface Research {
  notes: string;
  seen: SeenUrls;
}

function researchTools(cls: ClassConfig, blocked: string[]): Anthropic.Beta.BetaToolUnion[] {
  // Basic (non-"dynamic filtering") tool versions on purpose: every search result
  // and fetched page shows up in the response, so the server can check each URL.
  const tools: Anthropic.Beta.BetaToolUnion[] = [
    {
      type: "web_search_20250305",
      name: "web_search",
      max_uses: APP_CONFIG.maxWebSearches,
      blocked_domains: blocked.slice(0, MAX_BLOCKLIST),
    },
  ];
  const hosts = [...new Set(approvedBooks(cls).flatMap((b) => b.fetchHosts))];
  if (hosts.length) {
    tools.push({
      type: "web_fetch_20250910",
      name: "web_fetch",
      max_uses: APP_CONFIG.maxWebFetches,
      allowed_domains: hosts,
      max_content_tokens: APP_CONFIG.maxFetchTokens,
    });
  }
  return tools;
}

function collectUrls(content: Anthropic.Beta.BetaContentBlock[], seen: SeenUrls) {
  for (const block of content) {
    if (block.type === "web_search_tool_result" && Array.isArray(block.content)) {
      for (const r of block.content) {
        if (r.type === "web_search_result") seen.searched.push({ url: r.url, title: r.title });
      }
    } else if (block.type === "web_fetch_tool_result") {
      if (block.content.type === "web_fetch_result") {
        seen.fetched.push(block.content.url);
        console.log("fetch ok:", block.content.url);
      } else {
        console.log("fetch failed:", block.content.error_code);
      }
    } else if (block.type === "server_tool_use" && block.name === "web_fetch") {
      console.log("fetch requested:", JSON.stringify(block.input));
    }
  }
}

async function research(
  cls: ClassConfig,
  topic: string,
  images: NoteImage[],
  today: string,
  blocked: string[],
  bookLinks: BookLinks[],
  offLimitsUrls: string[] = [],
): Promise<Research> {
  const anthropic = getClient();
  const messages: Anthropic.Beta.BetaMessageParam[] = [
    {
      role: "user",
      content: [
        ...imageBlocks(images),
        { type: "text", text: researchUserText(bookLinks, topic, images.length, today, offLimitsUrls) },
      ],
    },
  ];
  const seen: SeenUrls = { fetched: [], searched: [] };
  let text = "";
  let paused = false;

  for (let i = 0; i <= MAX_CONTINUATIONS; i++) {
    const res = await anthropic.beta.messages.create({
      model: APP_CONFIG.model,
      max_tokens: 8000,
      system: researchSystemPrompt(cls),
      messages,
      tools: researchTools(cls, blocked),
      output_config: { effort: "medium" },
      // Research rereads the conversation after each search/fetch; caching makes
      // those rereads ~90% cheaper.
      cache_control: { type: "ephemeral" },
      ...FALLBACK,
    });

    logUsage("research", res.usage);
    collectUrls(res.content, seen);
    for (const block of res.content) if (block.type === "text") text += block.text;

    if (res.stop_reason === "refusal") {
      throw new GenerationError(
        "We can't make a study guide for that request. Try describing a school topic.",
        422,
        "research refusal",
      );
    }
    paused = res.stop_reason === "pause_turn";
    if (!paused) break;
    // Long server-tool turns pause; send the turn back and the API picks up where it left off.
    messages.push({ role: "assistant", content: res.content });
  }

  if (paused) {
    // Still unfinished after several continuations: don't build a guide from partial notes.
    throw new GenerationError("That took too long. Please try again, maybe with a narrower topic.", 504, "research still paused");
  }

  // The status line can come after text Claude writes between tool calls, so check it all.
  const statuses = [...text.matchAll(/STATUS:\s*(OK|DECLINE)/gi)].map((m) => m[1].toUpperCase());
  if (statuses.includes("DECLINE")) {
    throw new GenerationError(
      "That doesn't look like a school study topic. Try something like “photosynthesis” or “causes of WWI”.",
      422,
      "declined as off-topic",
    );
  }
  // Notes are everything after the last "STATUS: OK" line.
  const lastOk = [...text.matchAll(/STATUS:\s*OK[^\n]*/gi)].at(-1);
  const notes = (lastOk ? text.slice(lastOk.index + lastOk[0].length) : text).trim();
  if (notes.length < 50) {
    throw new GenerationError("We couldn't find enough material for that topic. Try rewording it.", 502, "empty notes");
  }
  return { notes, seen };
}

// ─── Step 2: write the guide ────────────────────────────────────────────────

async function compose(
  cls: ClassConfig,
  topic: string,
  images: NoteImage[],
  today: string,
  notes: string,
  sites: { title: string; url: string }[],
) {
  const anthropic = getClient();
  let problem = "";

  // First try, plus one retry if the JSON is malformed or fails validation.
  for (let attempt = 1; attempt <= 2; attempt++) {
    const userText =
      composeUserText({ topic, today, imageCount: images.length, notes, sites }) +
      (problem ? `\n\nA previous attempt was rejected for this reason; fix it: ${problem}` : "");

    const res = await anthropic.beta.messages.create({
      model: APP_CONFIG.model,
      max_tokens: 16000,
      system: composeSystemPrompt(cls),
      messages: [
        { role: "user", content: [...imageBlocks(images), { type: "text", text: userText }] },
      ],
      output_config: { effort: "medium", format: betaZodOutputFormat(StudyGuideSchema) },
      ...FALLBACK,
    });

    logUsage(`compose#${attempt}`, res.usage);
    if (res.stop_reason === "refusal") {
      throw new GenerationError(
        "We can't make a study guide for that request. Try describing a school topic.",
        422,
        "compose refusal",
      );
    }

    const raw = res.content
      .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");

    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch {
      problem =
        res.stop_reason === "max_tokens"
          ? "the output was cut off; keep definitions and explanations shorter"
          : "the output was not valid JSON";
      continue;
    }
    const parsed = StudyGuideSchema.safeParse(json);
    if (parsed.success) return parsed.data;
    problem = parsed.error.issues
      .slice(0, 5)
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
  }
  throw new GenerationError("Something went wrong making your guide. Please try again.", 502, `invalid guide: ${problem}`);
}

// ─── Whole pipeline ─────────────────────────────────────────────────────────

function attribution(book: ReturnType<typeof approvedBooks>[number]): BookAttribution {
  return {
    title: book.title,
    authors: book.authors,
    publisher: book.publisher,
    licenseName: book.license.name,
    licenseUrl: book.license.url,
    freeUrl: book.freeUrl,
    notice: book.requiredNotice,
  };
}

export async function generateGuide(args: {
  cls: ClassConfig;
  topic: string;
  images: NoteImage[];
  today: string;
}): Promise<GuideResponse> {
  const { cls, topic, images, today } = args;

  // Research, then check every URL it touched. If anything off-limits shows up,
  // throw the research away and redo it once with those sites blocked too.
  // Section lists for approved books (free: plain downloads, cached for a day).
  const bookLinks: BookLinks[] = await Promise.all(
    approvedBooks(cls).map(async (b) => ({
      title: b.title,
      startUrl: b.startUrl,
      sections: formatSectionLinks(await getSectionLinks(b)),
    })),
  );

  let blocked = searchBlockedDomains();
  let result = await research(cls, topic, images, today, blocked, bookLinks);
  let check = checkResearch(cls, result.seen);
  if (!check.ok) {
    console.warn("source check: retrying research; blocked hosts:", check.badHosts.join(", "));
    blocked = [...new Set([...blocked, ...check.badHosts])];
    result = await research(cls, topic, images, today, blocked, bookLinks, check.badUrls);
    check = checkResearch(cls, result.seen);
    if (!check.ok) {
      throw new GenerationError(
        "We couldn't find approved sources for that topic right now. Try rewording it.",
        502,
        `source check failed twice: ${check.badHosts.join(", ")}`,
      );
    }
  }

  const guide = await compose(cls, topic, images, today, result.notes, check.safeSites);
  guide.webSources = filterWebSources(guide.webSources, check.safeSites);
  guide.usedStudentNotes = guide.usedStudentNotes && images.length > 0;

  return {
    guide,
    className: cls.name,
    books: check.booksUsed.map(attribution),
  };
}
