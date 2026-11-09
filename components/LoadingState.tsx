"use client";

import type { JobResponse } from "@/lib/schema";

const fmt = (s: number) => (s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`);

/** Shows the student's place in line, then each team member's step as the guide is made. */
export default function LoadingState({ progress }: { progress: JobResponse | null }) {
  const queued = progress?.status === "queued";
  const running = progress?.status === "running";

  return (
    <div role="status" aria-live="polite" className="py-12 flex flex-col items-center gap-6 text-center">
      <div className="h-12 w-12 rounded-full border-4 border-line border-t-accent animate-spin" aria-hidden />

      {!progress && <p className="text-lg font-semibold">Sending your request…</p>}

      {queued && (
        <div className="space-y-2">
          <p className="text-lg font-semibold">
            {progress.position === 1 ? "You're next in line" : `You're #${progress.position} in line`}
          </p>
          <p className="text-sm text-muted">
            Our study guide team makes one guide at a time. Keep this page open; it starts automatically.
          </p>
        </div>
      )}

      {running && (
        <div className="w-full max-w-sm space-y-4">
          <div className="space-y-1">
            <p className="text-lg font-semibold">The team is making your guide</p>
            <p className="text-sm text-muted">
              {progress.elapsed != null ? `${fmt(progress.elapsed)} so far · ` : ""}usually 5–8 minutes. Keep this page open.
            </p>
          </div>
          {progress.team && (
            <ol className="text-left space-y-2">
              {progress.team.map((m) => (
                <li
                  key={m.role}
                  className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-sm ${
                    m.working ? "border-accent bg-card" : "border-line"
                  }`}
                >
                  <span
                    aria-hidden
                    className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] ${
                      m.working ? "bg-accent text-accent-fg" : m.done ? "bg-green-600 text-white" : "border border-line text-muted"
                    }`}
                  >
                    {m.done ? "✓" : m.working ? "•" : ""}
                  </span>
                  <span className="min-w-0">
                    <span className="font-medium">{m.role}</span>
                    <span className="block text-muted">
                      {m.working ? `${m.task ?? "Working"}…` : m.done ? "Done" : "Waiting"}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </div>
  );
}
