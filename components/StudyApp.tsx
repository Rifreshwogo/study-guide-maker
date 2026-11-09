"use client";

import { useState } from "react";
import type { GenerateRequest } from "@/lib/request";
import type { GuideErrorResponse, GuideResponse, JobResponse, QueuedResponse } from "@/lib/schema";
import StudyForm from "./StudyForm";
import LoadingState from "./LoadingState";
import StudyGuide from "./StudyGuide";

type Phase =
  | { kind: "form" }
  | { kind: "loading"; progress: JobResponse | null }
  | { kind: "error"; message: string; request: GenerateRequest }
  | { kind: "done"; result: GuideResponse };

const POLL_MS = 2500;
const GIVE_UP_MS = 45 * 60 * 1000;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function readError(res: Response, fallback: string): Promise<string> {
  const data = (await res.json().catch(() => null)) as GuideErrorResponse | null;
  if (data?.error) return data.error;
  return res.status === 413 ? "Those photos are too large. Try fewer photos." : fallback;
}

/** Gets in line, then checks in every few seconds until the guide is ready. */
async function requestGuide(request: GenerateRequest, onProgress: (p: JobResponse) => void): Promise<GuideResponse> {
  let jobId: string;
  try {
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
    if (!res.ok) throw new Error(await readError(res, "Something went wrong. Please try again."));
    const ticket = (await res.json()) as QueuedResponse;
    jobId = ticket.jobId;
    onProgress(ticket.position > 0 ? { status: "queued", position: ticket.position } : { status: "running", elapsed: 0 });
  } catch (e) {
    if (e instanceof TypeError) throw new Error("Couldn't reach the study guide server. It may be offline right now. Please try again later.");
    throw e;
  }

  const started = Date.now();
  let misses = 0;
  while (Date.now() - started < GIVE_UP_MS) {
    await wait(POLL_MS);
    let res: Response;
    try {
      res = await fetch(`/api/jobs/${jobId}`, { cache: "no-store" });
    } catch {
      // A brief connection hiccup: keep trying for a little while.
      if (++misses > 12) throw new Error("Lost the connection to the study guide server. Please try again.");
      continue;
    }
    misses = 0;
    if (!res.ok) throw new Error(await readError(res, "Something went wrong making your guide. Please try again."));
    const job = (await res.json()) as JobResponse;
    if (job.status === "done" && job.result) return job.result;
    if (job.status === "error") throw new Error(job.error ?? "Something went wrong making your guide. Please try again.");
    onProgress(job);
  }
  throw new Error("That took too long. Please try again, maybe with a narrower topic.");
}

export default function StudyApp() {
  const [phase, setPhase] = useState<Phase>({ kind: "form" });
  // Changing this key resets the form (used by "Make another guide").
  const [formKey, setFormKey] = useState(0);

  async function submit(request: GenerateRequest) {
    setPhase({ kind: "loading", progress: null });
    window.scrollTo({ top: 0 });
    try {
      const result = await requestGuide(request, (progress) => setPhase({ kind: "loading", progress }));
      setPhase({ kind: "done", result });
    } catch (e) {
      setPhase({
        kind: "error",
        request,
        message: e instanceof Error ? e.message : "Something went wrong. Please try again.",
      });
    }
  }

  // One fixed layout: the form stays mounted (just hidden) while loading or
  // showing an error, so "Edit my request" brings back the class, topic, and photos.
  // It's only reset (new key) by "Make another guide".
  return (
    <>
      {phase.kind === "loading" && <LoadingState progress={phase.progress} />}

      {phase.kind === "error" && (
        <div role="alert" className="py-12 space-y-5 text-center">
          <p className="text-4xl" aria-hidden>
            😕
          </p>
          <p className="text-lg font-semibold">{phase.message}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => submit(phase.request)}
              className="rounded-lg bg-accent px-5 py-3 font-semibold text-accent-fg"
            >
              Try again
            </button>
            <button
              onClick={() => setPhase({ kind: "form" })}
              className="rounded-lg border border-line px-5 py-3 font-medium"
            >
              Edit my request
            </button>
          </div>
        </div>
      )}

      {phase.kind === "done" && (
        <StudyGuide
          result={phase.result}
          onMakeAnother={() => {
            setFormKey((k) => k + 1);
            setPhase({ kind: "form" });
            window.scrollTo({ top: 0 });
          }}
        />
      )}

      <div className={phase.kind === "form" ? "space-y-6" : "hidden"}>
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Make a study guide</h1>
          <p className="text-muted">
            Get key terms, flashcards, a practice quiz, and a study plan, made for you in a few minutes.
          </p>
        </div>
        <StudyForm key={formKey} onSubmit={submit} />
      </div>
    </>
  );
}
