"use client";

import { useState } from "react";
import type { StudyGuide } from "@/lib/schema";

function formatDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
}

export default function StudyPlan({ plan }: { plan: StudyGuide["studyPlan"] }) {
  const [done, setDone] = useState<Set<string>>(new Set());

  function toggle(key: string) {
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div className="space-y-3">
      {plan.testDate && (
        <p className="text-sm">
          <span className="font-semibold">Test day:</span> {formatDate(plan.testDate)}
        </p>
      )}
      <ol className="space-y-3">
        {plan.days.map((day, di) => (
          <li key={di} className="rounded-lg border border-line bg-card p-4 print-break-avoid">
            <h3 className="font-semibold mb-2">{day.label}</h3>
            <ul className="space-y-1.5">
              {day.tasks.map((task, ti) => {
                const key = `${di}-${ti}`;
                const checked = done.has(key);
                return (
                  <li key={ti}>
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(key)}
                        className="mt-1 h-4 w-4 accent-[var(--accent)]"
                      />
                      <span className={checked ? "line-through text-muted" : ""}>{task}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ol>
    </div>
  );
}
