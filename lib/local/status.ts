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

function save() {
  if (process.env.VERCEL) return;
  try {
    const s = store();
    const data = JSON.stringify({ updatedAt: Date.now(), ...snapshot(), events: s.events });
    fs.mkdirSync(path.dirname(STATUS_FILE), { recursive: true });
    const tmp = `${STATUS_FILE}.tmp`;
    fs.writeFileSync(tmp, data);
    fs.renameSync(tmp, STATUS_FILE); // swap in whole, so the office never reads half a file
  } catch {
    // The office is optional; never let it break guide generation.
  }
}

interface Store {
  members: Record<MemberId, MemberStatus>;
  events: TeamEvent[];
  guide: { className: string; startedAt: number } | null;
}

const g = globalThis as unknown as { __studyTeamStatus?: Store };

function store(): Store {
  g.__studyTeamStatus ??= {
    members: Object.fromEntries(
      MEMBERS.map((m) => [m.id, { id: m.id, state: "idle", task: null, since: null, lastSeconds: null }]),
    ) as Record<MemberId, MemberStatus>,
    events: [],
    guide: null,
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
  // If something failed mid-step, don't leave anyone stuck as "working".
  for (const m of Object.values(s.members)) {
    if (m.state === "working") {
      m.state = "idle";
      m.task = null;
      m.since = null;
    }
  }
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
