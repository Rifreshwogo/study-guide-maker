"use client";

import { useEffect, useState } from "react";

const STEPS = [
  "Reading your notes…",
  "Finding the right textbook sections…",
  "Researching your topic…",
  "Picking out the key terms…",
  "Writing flashcards…",
  "Building your practice quiz…",
  "Planning your study schedule…",
  "Almost done…",
];

export default function LoadingState() {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Move through the messages over about 90 seconds, then stay on the last.
  const step = Math.min(STEPS.length - 1, Math.floor(seconds / 12));

  return (
    <div role="status" aria-live="polite" className="py-16 flex flex-col items-center gap-6 text-center">
      <div className="h-12 w-12 rounded-full border-4 border-line border-t-accent animate-spin" aria-hidden />
      <div className="space-y-2">
        <p className="text-lg font-semibold">{STEPS[step]}</p>
        <p className="text-sm text-muted">
          This usually takes 1–2 minutes. Keep this page open.
        </p>
      </div>
    </div>
  );
}
