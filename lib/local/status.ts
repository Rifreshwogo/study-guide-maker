import "server-only";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { MEMBERS, type MemberId, type MemberStatus, type TeamEvent } from "./members";

/**
 * Live "who's working on what", for your separate Team Office app. Written to a
 * small file on your Mac (~/.study-team/status.json) whenever it changes; never on
 * Vercel. It never includes the student's topic or notes, only the class name.
 * Stored on globalThis so every route in the dev server sees the same copy.
 */

const STATUS_FILE = process.env.TEAM_STATUS_FILE ?? path.join(os.homedir(), ".study-team", "status.json");
/** Totals that must survive restarts: guides made and website checks. Counts and hostnames only. */
const STATS_FILE = path.join(path.dirname(STATUS_FILE), "stats.json");

/** What the website checks enforce, in plain English (see allowedForLocal and readPage in web.ts). */
const SECURITY_RULES = [
  "OpenStax books are blocked until you approve them",
  "Copies of OpenStax books on other sites are blocked",
  "Textbook pages must come from inside an approved book",
  "Video, social media, Q&A and homework-answer sites are skipped",
  "Only public web addresses: never this Mac, the home network or raw IP addresses",
  "Redirects are checked again where they land",
];

export interface SiteCheck {
  at: number;
  site: string;
  result: "allowed" | "blocked";
  reason: string | null;
}

interface Stats {
  guidesTotal: number;
  guidesByMonth: { month: string; count: number }[];
  checkedTotal: number;
  blockedTotal: number;
  recent: SiteCheck[];
}

function writeAtomic(file: string, data: string) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, data);
  fs.renameSync(tmp, file); // swap in whole, so readers never see half a file
}

function loadStats(): Stats {
  const empty: Stats = { guidesTotal: 0, guidesByMonth: [], checkedTotal: 0, blockedTotal: 0, recent: [] };
  if (process.env.VERCEL) return empty;
  try {
    const d = JSON.parse(fs.readFileSync(STATS_FILE, "utf8")) as Partial<Stats>;
    const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0);
    return {
      guidesTotal: n(d.guidesTotal),
      guidesByMonth: Array.isArray(d.guidesByMonth) ? d.guidesByMonth.slice(0, 12) : [],
      checkedTotal: n(d.checkedTotal),
      blockedTotal: n(d.blockedTotal),
      recent: Array.isArray(d.recent) ? d.recent.slice(0, 20) : [],
    };
  } catch {
    return empty;
  }
}

function saveStats() {
  if (process.env.VERCEL) return;
  try {
    writeAtomic(STATS_FILE, JSON.stringify(store().stats));
  } catch {
    // Optional; never break guide generation.
  }
}

function save() {
  if (process.env.VERCEL) return;
  try {
    const s = store();
    const { guidesTotal, guidesByMonth, checkedTotal, blockedTotal, recent } = s.stats;
    const data = JSON.stringify({
      updatedAt: Date.now(),
      ...snapshot(),
      events: s.events,
      stats: { guidesTotal, guidesByMonth },
      security: { checkedTotal, blockedTotal, rules: SECURITY_RULES, recent },
    });
    writeAtomic(STATUS_FILE, data);
  } catch {
    // The office is optional; never let it break guide generation.
  }
}

interface Store {
  members: Record<MemberId, MemberStatus>;
  events: TeamEvent[];
  guide: { className: string; startedAt: number } | null;
  stats: Stats;
}

const g = globalThis as unknown as { __studyTeamStatus?: Store };

function store(): Store {
  g.__studyTeamStatus ??= {
    members: Object.fromEntries(
      MEMBERS.map((m) => [m.id, { id: m.id, state: "idle", task: null, since: null, lastSeconds: null }]),
    ) as Record<MemberId, MemberStatus>,
    events: [],
    guide: null,
    stats: loadStats(),
  };
  return g.__studyTeamStatus;
}

function addEvent(member: TeamEvent["member"], text: string) {
  const s = store();
  s.events.unshift({ at: Date.now(), member, text });
  s.events.length = Math.min(s.events.length, 25);
}

export function markStart(id: MemberId, task: string) {
  const m = store().members[id];
  m.state = "working";
  m.task = task;
  m.since = Date.now();
  save();
}

export function markEnd(id: MemberId, summary?: string) {
  const m = store().members[id];
  if (m.state !== "working") return;
  const seconds = m.since ? Math.round((Date.now() - m.since) / 1000) : null;
  const name = MEMBERS.find((x) => x.id === id)?.role ?? id;
  addEvent(id, `${name}: ${summary ?? `finished ${lower(m.task ?? "its step")}`}${seconds !== null ? ` (${formatSeconds(seconds)})` : ""}`);
  m.state = "idle";
  m.task = null;
  m.since = null;
  m.lastSeconds = seconds;
  save();
}

export function guideStarted(className: string) {
  store().guide = { className, startedAt: Date.now() };
  addEvent("team", `New guide started: ${className}`);
  save();
}

export function guideEnded(ok: boolean, note?: string) {
  const s = store();
  const seconds = s.guide ? Math.round((Date.now() - s.guide.startedAt) / 1000) : null;
  addEvent("team", `${ok ? "Guide finished" : "Guide stopped"}${note ? `: ${note}` : ""}${seconds !== null ? ` (${formatSeconds(seconds)})` : ""}`);
  s.guide = null;
  if (ok) countGuide(s.stats);
  // If something failed mid-step, don't leave anyone stuck as "working".
  for (const m of Object.values(s.members)) {
    if (m.state === "working") {
      m.state = "idle";
      m.task = null;
      m.since = null;
    }
  }
  save();
  if (ok) saveStats();
}

/** Month in the Mac's local time, like "2026-11". */
function localMonth(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function countGuide(stats: Stats) {
  stats.guidesTotal += 1;
  const month = localMonth();
  const row = stats.guidesByMonth.find((r) => r.month === month);
  if (row) row.count += 1;
  else stats.guidesByMonth.push({ month, count: 1 });
  stats.guidesByMonth.sort((a, b) => b.month.localeCompare(a.month));
  stats.guidesByMonth.length = Math.min(stats.guidesByMonth.length, 12);
}

/** Records one website check (hostname only, never the full address). */
export function recordSiteCheck(url: string, blockReason: string | null) {
  let site = "unknown";
  try {
    site = new URL(url).hostname.toLowerCase();
  } catch {
    // keep "unknown"
  }
  const stats = store().stats;
  stats.checkedTotal += 1;
  if (blockReason) stats.blockedTotal += 1;
  stats.recent.unshift({ at: Date.now(), site, result: blockReason ? "blocked" : "allowed", reason: blockReason });
  stats.recent.length = Math.min(stats.recent.length, 20);
  saveStats();
  save();
}

export function snapshot() {
  const s = store();
  return { members: MEMBERS.map((m) => s.members[m.id]), events: s.events, guide: s.guide };
}

function lower(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}

export function formatSeconds(s: number): string {
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
}

/** Which team member an Ollama call belongs to, and what to show them doing. */
export function memberForAgent(agent: string): { id: MemberId; task: string } | null {
  if (agent.startsWith("notes-reader")) return { id: "notes-reader", task: "Reading the note photos" };
  if (agent.startsWith("researcher")) return { id: "researcher", task: "Picking textbook sections and searches" };
  if (agent.startsWith("writer")) {
    const n = agent.split("#")[1];
    return { id: "writer", task: n && n !== "1" ? `Rewriting the guide (try ${n})` : "Writing the study guide" };
  }
  if (agent.startsWith("checker-solve")) return { id: "checker", task: "Re-solving the quiz without the answers" };
  if (agent.startsWith("checker-judge")) return { id: "checker", task: `Re-checking question ${agent.split("#")[1] ?? ""}`.trim() };
  return null;
}
