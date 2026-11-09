# Study Guide Maker

A free website where any student types a class or subject and what they're studying,
optionally adds photos of their notes, and gets an interactive study guide: key terms with
high-yield flags, flashcards, a practice quiz with explanations, a study plan, common traps,
and a list of every source used.

**Everything runs on local AI models on one Mac.** There's no cloud AI and no API bill. The
Mac is the website's server, and Cloudflare Tunnel gives it a public address.

> ## ⚠️ This site must stay free
>
> Most of the textbooks are licensed **NonCommercial** (CC BY-NC / CC BY-NC-SA), and
> OpenStax content may only be used in AI products with OpenStax's permission.
> **Charging money for this site** would require removing every NonCommercial source and
> every OpenStax source first. The only book here that allows commercial use is
> *The American Yawp* (CC BY-SA 4.0). Public-domain Project Gutenberg texts are also fine.

---

## How it works

1. A student enters **any class or subject** (e.g. "AP Biology", "Algebra 2") and a topic.
   If the subject matches a class in `sources.config.ts` (by name or `aliases`), the team
   uses that class's approved textbook; otherwise it researches the web. "AP" subjects are
   aligned to the College Board's public course descriptions.
2. The request **gets in line** (`lib/jobs.ts`). The Mac makes one guide at a time (about
   5–8 minutes each); the page shows the student's place in line, then each team member's
   progress. At most 8 can wait; requests and photos are kept in memory only.
3. The **local team** (`lib/local/team.ts`), all running `qwen3-vl:8b-instruct` on Ollama:

| Member | Job |
|---|---|
| Notes Reader | Turns note photos into text |
| Researcher | Picks 1–3 textbook sections and writes web searches (or declines off-topic requests) |
| Librarian *(code, not a model)* | Downloads only allowed pages: approved-book sections, plus web results that pass the OpenStax and source-quality checks before any model sees them |
| Writer | Builds the guide JSON (validated, one retry) |
| Checker | Re-solves the quiz without seeing the answers; fixes answers that disagree |

Web search runs on **SearXNG**, a private search engine on the Mac (safe search on strict).
Video, social, Q&A, and homework-answer sites are skipped.

## Run it

You need [Node.js](https://nodejs.org) 20+, the [Ollama](https://ollama.com) app, and
SearXNG (installed in `~/.local/searxng`).

1. Download the model once (6.2 GB):
   ```bash
   ollama pull qwen3-vl:8b-instruct
   ```
2. Install packages once:
   ```bash
   npm install
   ```
3. Start local search and leave it running:
   ```bash
   ~/.local/searxng/start.sh
   ```
4. Build and start the site (it listens only on this Mac):
   ```bash
   npm run build
   ```
   ```bash
   npx next start -p 3000 -H 127.0.0.1
   ```
5. Put it online with a free temporary address (it changes every time this restarts):
   ```bash
   ~/.local/bin/cloudflared tunnel --no-autoupdate --url http://127.0.0.1:3000
   ```
   The address it prints (`https://….trycloudflare.com`) is the site. For a permanent
   address, buy a domain and set up a *named* Cloudflare Tunnel.

**The site is only up while the Mac is on and awake** with Ollama, SearXNG, the site, and
the tunnel running. Keep it plugged in and stop it from sleeping while the site is live.

## Turn on an OpenStax book (pending → approved)

All class and book settings live in [`sources.config.ts`](sources.config.ts).

1. Find the book in `BOOKS` (for example `"openstax-anatomy-2e"`).
2. Change `status: "pending"` to `status: "approved"`.
3. Rebuild and restart the site.

From then on, the Librarian may read that book's pages, and guides that use it show
OpenStax's attribution. Web search keeps skipping OpenStax and its copies in every case.
Re-check each book's license on its OpenStax page before approving.

## Add a class with its own textbook

Add a book to `BOOKS` and a class to `CLASSES` in `sources.config.ts`, with `aliases` for the
ways students might type it. Any other subject already works through web research.

## Settings

- [`app.config.ts`](app.config.ts): input limits, photo limits, and rate limits (5 guides
  per visitor per hour, 100 per day for the whole site).
- [`lib/local/config.ts`](lib/local/config.ts): the model, context size, and how many pages
  the team reads. `.env.local` can override `LOCAL_MODEL`, `OLLAMA_URL`, `SEARXNG_URL`.

## Team Office

The team writes what it's doing to `~/.study-team/status.json` (steps and timing only, never
what a student typed). The separate `team-office` project reads it to show the team at work.

## The old Vercel deployment

The code shows a "Study Guide Maker has moved" page if it's ever deployed on Vercel,
because Vercel's servers can't reach the Mac's models.

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

- **Tulsa *Fundamentals of Personal Finance*:** the site blocks automated downloads, so the
  local team can't read it; Personal Finance uses the Coastline book and the web instead.
- **The American Yawp:** each chapter is one long page, and the team reads about the first
  7,000 characters, so later parts of a chapter can be missed.
- **Copies of OpenStax text:** the app catches them on known sites and in URLs that
  mention OpenStax. Text copied onto an unrelated site without saying so can't be detected.
- **Speed:** one guide at a time, about 5–8 minutes each, so busy times mean a wait.
- **Accuracy:** guides are made by a small local model and can contain mistakes. Every page footer tells students to check
  important details with their teacher.

## Safety

- No accounts, names, emails, or school IDs are collected. Visitors are counted for rate
  limits by a hashed IP address (Cloudflare passes the real visitor address).
- The site listens only on 127.0.0.1, so the tunnel is the only way in from outside.
- Requests from other websites are refused; security headers block framing.
- Input limits: 80-character subject, 500-character topic, 5 photos (checked to be real
  JPEG/PNG). Photos are dropped as soon as their guide is made.
- The team is told to keep content school-appropriate, decline requests that aren't study
  topics, and treat student text and photos as material, never instructions.
