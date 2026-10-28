"use client";

import { useState } from "react";
import type { GenerateRequest } from "@/lib/request";
import type { GuideErrorResponse, GuideResponse } from "@/lib/schema";
import StudyForm from "./StudyForm";
import LoadingState from "./LoadingState";
import StudyGuide from "./StudyGuide";

type Phase =
  | { kind: "form" }
  | { kind: "loading" }
  | { kind: "error"; message: string; request: GenerateRequest }
  | { kind: "done"; result: GuideResponse };

const CLIENT_TIMEOUT_MS = 310_000;

async function requestGuide(request: GenerateRequest): Promise<GuideResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);
  try {
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      signal: controller.signal,
    });
    const data = (await res.json().catch(() => null)) as GuideResponse | GuideErrorResponse | null;
    if (!res.ok || !data || "error" in data) {
      throw new Error(
        data && "error" in data
          ? data.error
          : res.status === 413
            ? "Those photos are too large. Try fewer photos."
            : "Something went wrong making your guide. Please try again.",
      );
    }
    return data;
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") {
      throw new Error("That took too long. Please try again, maybe with a narrower topic.");
    }
    if (e instanceof TypeError) {
      throw new Error("Couldn't reach the server. Check your internet connection and try again.");
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

export default function StudyApp() {
  const [phase, setPhase] = useState<Phase>({ kind: "form" });
  // Changing this key resets the form (used by "Make another guide").
  const [formKey, setFormKey] = useState(0);

  async function submit(request: GenerateRequest) {
    setPhase({ kind: "loading" });
    window.scrollTo({ top: 0 });
    try {
      const result = await requestGuide(request);
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
      {phase.kind === "loading" && <LoadingState />}

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
            Get key terms, flashcards, a practice quiz, and a study plan in about a minute.
          </p>
        </div>
        <StudyForm key={formKey} onSubmit={submit} />
      </div>
    </>
  );
}
