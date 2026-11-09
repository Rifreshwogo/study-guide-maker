import "server-only";
import { randomUUID } from "node:crypto";
import type { ClassConfig } from "@/sources.config";
import type { NoteImage } from "@/lib/request";
import type { GuideResponse } from "@/lib/schema";
import { GenerationError } from "@/lib/errors";
import { LocalModelError } from "@/lib/local/ollama";
import { generateGuideLocal } from "@/lib/local/team";
import { snapshot } from "@/lib/local/status";
import { MEMBERS } from "@/lib/local/members";

/**
 * The waiting line. The local models can make one guide at a time, so requests
 * wait their turn here. Everything is in memory: nothing is written to disk, and
 * note photos are dropped as soon as their guide is made.
 */

const MAX_WAITING = 8;
const KEEP_FINISHED_MS = 30 * 60 * 1000;

interface JobInput {
  cls: ClassConfig;
  topic: string;
  images: NoteImage[];
  today: string;
}

interface Job {
  id: string;
  status: "queued" | "running" | "done" | "error";
  createdAt: number;
  startedAt?: number;
  finishedAt?: number;
  input: JobInput | null;
  result?: GuideResponse;
  error?: string;
}

export interface JobView {
  status: Job["status"];
  /** 1 = next in line. Only while queued. */
  position?: number;
  /** Seconds since the guide started being made. */
  elapsed?: number;
  /** What each team member is doing right now (while running). */
  team?: { role: string; working: boolean; task: string | null; done: boolean }[];
  result?: GuideResponse;
  error?: string;
}

interface Store {
  jobs: Map<string, Job>;
  queue: string[];
  running: string | null;
}
const g = globalThis as unknown as { __studyGuideJobs?: Store };
const store: Store = (g.__studyGuideJobs ??= { jobs: new Map(), queue: [], running: null } as Store);

function cleanup() {
  const now = Date.now();
  for (const [id, job] of store.jobs) {
    if (job.finishedAt && now - job.finishedAt > KEEP_FINISHED_MS) store.jobs.delete(id);
  }
}

function friendly(e: unknown): string {
  if (e instanceof GenerationError) return e.userMessage;
  if (e instanceof LocalModelError) return "The study guide team isn't available right now. Please try again later.";
  return "Something went wrong making your guide. Please try again.";
}

function next() {
  if (store.running || store.queue.length === 0) return;
  const id = store.queue.shift()!;
  const job = store.jobs.get(id);
  if (!job?.input) return next();
  store.running = id;
  job.status = "running";
  job.startedAt = Date.now();
  generateGuideLocal(job.input)
    .then((result) => {
      job.result = result;
      job.status = "done";
    })
    .catch((e) => {
      console.error("guide failed:", e instanceof Error ? e.message : e);
      job.error = friendly(e);
      job.status = "error";
    })
    .finally(() => {
      job.finishedAt = Date.now();
      job.input = null; // drop the note photos right away
      store.running = null;
      cleanup();
      next();
    });
}

/** Puts a request in line and returns its ticket id. */
export function enqueue(input: JobInput): { id: string; position: number } {
  cleanup();
  if (store.queue.length >= MAX_WAITING) {
    throw new GenerationError("Lots of students are studying right now. Please try again in a few minutes.", 503);
  }
  const id = randomUUID();
  store.jobs.set(id, { id, status: "queued", createdAt: Date.now(), input });
  store.queue.push(id);
  const position = store.queue.indexOf(id) + 1;
  next();
  return { id, position: store.jobs.get(id)!.status === "queued" ? position : 0 };
}

export function viewJob(id: string): JobView | null {
  const job = store.jobs.get(id);
  if (!job) return null;
  if (job.status === "queued") return { status: "queued", position: store.queue.indexOf(id) + 1 };
  if (job.status === "running") {
    const snap = snapshot();
    const started = job.startedAt ?? Date.now();
    return {
      status: "running",
      elapsed: Math.round((Date.now() - started) / 1000),
      team: MEMBERS.map((m) => {
        const st = snap.members.find((x) => x.id === m.id);
        const working = st?.state === "working";
        const finishedThisGuide = !working && snap.events.some((e) => e.member === m.id && e.at >= started);
        return { role: m.role, working, task: working ? st?.task ?? null : null, done: finishedThisGuide };
      }),
    };
  }
  if (job.status === "done") return { status: "done", result: job.result };
  return { status: "error", error: job.error };
}
