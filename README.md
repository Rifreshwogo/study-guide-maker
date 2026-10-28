# Study Guide Maker

A free web app for high school students. A student picks their class, types what they're
studying, and can add up to 5 photos of their class notes. Claude then builds an
interactive study guide: key terms with high-yield flags, flashcards, a practice quiz with
explanations, a study plan, common traps, and a list of every source used.

Built with Next.js (App Router), TypeScript, Tailwind, and the Anthropic API. No accounts
and no database.

> ## ⚠️ This app must stay free
>
> Most of the textbooks are licensed **NonCommercial** (CC BY-NC / CC BY-NC-SA), and
> OpenStax content may only be used in AI products with OpenStax's permission.
> **Charging money for this app** (subscriptions, paid tiers, paywalled features) **would
> require removing every NonCommercial source and every OpenStax source first.** The only
> book here that allows commercial use is *The American Yawp* (CC BY-SA 4.0).
> Public-domain Project Gutenberg texts are also fine.

---

## Run it locally

You need [Node.js](https://nodejs.org) 20 or newer.

```bash
npm install
```

```bash
cp .env.example .env.local
```

Open `.env.local` and paste your Anthropic API key (see below), then:

```bash
npm run dev
```

Open http://localhost:3000. To try it on your phone, open the "Network" address that
`npm run dev` prints, while your phone is on the same Wi-Fi.

## Add your API key

1. Get a key at [console.anthropic.com](https://console.anthropic.com) → **API Keys**.
2. In `.env.local`, set `ANTHROPIC_API_KEY=sk-ant-...` (no quotes or spaces).
3. Restart `npm run dev` so it picks up the change.

The key is only read by the server (`lib/generate.ts`). It is never sent to the browser,
and `.env.local` is excluded from git.

**Tip:** In the Anthropic Console, set a monthly spend limit under **Settings → Limits** so
the bill can never pass an amount you choose.

## Turn on an OpenStax book (pending → approved)

All class and book settings live in [`sources.config.ts`](sources.config.ts).

1. Find the book in `BOOKS` (for example `"openstax-anatomy-2e"`).
2. Change `status: "pending"` to `status: "approved"`.
3. Restart the app (or redeploy on Vercel).

That's all. From then on, the app:

- lets the AI fetch that book's pages (limited to that book's own URLs),
- stops treating that book as off-limits in source checks, and
- shows OpenStax's attribution and link on every guide that uses it.

Web *search* keeps blocking openstax.org and known copies of OpenStax books in every class,
because OpenStax's AI restriction covers all of its books. Approved OpenStax books are read
by fetching their pages directly, which is the path the app checks and controls.

Optional: to give an approved OpenStax book a chapter list (cheaper and more precise),
add an `index` entry like the LibreTexts books have. Without one, the AI opens the book's
`startUrl` itself.

Before approving, re-check each book's license on its OpenStax page. The licenses in the config
weren't checked against OpenStax's own pages.

## How a guide is made

1. **Research** (`lib/generate.ts`, `lib/prompt.ts`). Claude reads the approved textbook
   for the class and opens only the 1–3 sections that match the request. Then it uses web
   search to fill gaps, preferring .edu and .gov sites, College Board, IB, and Khan
   Academy. Note photos come first, since they show what the teacher covered.
   - Before the AI runs, the server downloads each book's chapter list (`lib/bookIndex.ts`).
     This costs nothing and is cached for a day.
   - Web search always blocks OpenStax and its mirrors (`OPENSTAX_MIRROR_DOMAINS`).
2. **Source check** (`lib/sourceCheck.ts`). The server checks every URL the AI searched or
   fetched. If it finds a pending book, an OpenStax copy, or a page outside the approved
   books, it throws the research away and redoes it once with those sites blocked. If that
   fails too, the student sees a friendly error.
3. **Writing.** A second call turns the notes into JSON that follows a schema
   (`lib/schema.ts`). The server validates it and retries once if it's malformed.
4. **Sources.** The server writes book attribution from the config, based on which pages
   were actually used. Any website the AI lists without having visited it is dropped.

Uploaded photos stay in memory for that one request and are never saved. In the browser,
each photo is resized and saved as a new JPEG before upload, which also removes hidden
photo data such as GPS location.

## Settings

[`app.config.ts`](app.config.ts) holds the model (`claude-sonnet-5-5`), input limits,
photo limits, rate limits, and web research limits.

| Setting | Default | What it does |
|---|---|---|
| `rateLimitPerHour` | 5 | Guides per IP address per hour |
| `globalDailyLimit` | 100 | Guides per day for the whole app (protects your bill) |
| `maxWebSearches` / `maxWebFetches` | 3 / 4 | Web research per guide |
| `maxTopicChars` | 500 | Length of the study request |
| `maxImages` / `maxImageBytes` | 5 / 600 KB | Note photos (Vercel rejects requests over 4.5 MB) |

**Cost:** about $0.10–0.20 per guide in testing. The server log prints token counts for
each step (never student content), so you can track cost in Vercel's logs.

## Deploy to Vercel

1. Push this folder to a GitHub repository and import it in Vercel.
2. In **Project → Settings → Environment Variables**, add `ANTHROPIC_API_KEY`.
3. **Set up rate limiting that works across servers** (recommended). Vercel runs the app
   on many short-lived servers, so a limit kept in memory alone is easy to get around.
   Create a free [Upstash Redis](https://upstash.com) database (or add it from the Vercel
   Marketplace) and add `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`. Without
   them, the app falls back to memory-only limits.
4. Deploy. The generate route allows up to 300 seconds (`maxDuration`), the maximum on the
   Hobby plan. Guides usually take 40–60 seconds.

## Classes and sources

| Class | Main source | Status |
|---|---|---|
| IB HL History of the Americas | The American Yawp (CC BY-SA 4.0) + web research for Latin America and Canada | approved |
| Personal Finance | Personal Finance v2, Coastline (LibreTexts) + Fundamentals of Personal Finance, Tulsa CC (CC BY-NC-SA 4.0) | approved |
| IB Government | Intro to Comparative Government and Politics (CC BY-NC 4.0); OpenStax Intro to Political Science | approved; OpenStax pending |
| IB HL English | Writing and Critical Thinking Through Literature (CC BY-NC 4.0) + Project Gutenberg | approved |
| Honors Anatomy & Physiology | OpenStax Anatomy and Physiology 2e | pending → web research |
| AP Calculus AB | OpenStax Calculus Volume 1 | pending → web research aligned to the College Board CED |
| Sociology / Anthropology | OpenStax Intro to Sociology 3e + Intro to Anthropology | pending → web research |

## Known limitations

- **Tulsa *Fundamentals of Personal Finance*:** the site blocks automated downloads, so it
  has no chapter list. The AI opens its contents page instead, which costs more.
- **The American Yawp:** each chapter is one long page, and a fetch reads about the first
  8,000 tokens, so later parts of a chapter can be missed.
- **Copies of OpenStax text:** the app catches them on known sites and in URLs that
  mention OpenStax. Text copied onto an unrelated site without saying so can't be detected.
- **Accuracy:** guides are AI-generated. Every page footer tells students to check
  important details with their teacher.

## Safety

- No accounts, names, emails, or school IDs are collected. IP addresses are hashed before
  being used for rate limits.
- Input limits: 500 characters of text and 5 photos. The server checks that each photo
  really is a JPEG or PNG.
- Prompts tell Claude to keep content school-appropriate, decline requests that aren't
  study topics, and treat the student's text and photos as material to study, never as
  instructions.
- If Claude declines a request, the API retries it on a backup model ("server-side
  fallback").
