"use client";

import { useState } from "react";
import type { StudyGuide } from "@/lib/schema";

type Card = StudyGuide["flashcards"][number];

function shuffled<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function Flashcards({ cards }: { cards: Card[] }) {
  const [deck, setDeck] = useState(cards);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const card = deck[index];

  function go(delta: number) {
    setIndex((i) => (i + delta + deck.length) % deck.length);
    setFlipped(false);
  }

  function shuffle() {
    setDeck(shuffled(cards));
    setIndex(0);
    setFlipped(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowRight") go(1);
    else if (e.key === "ArrowLeft") go(-1);
  }

  return (
    <>
      {/* Interactive deck (screen only) */}
      <div className="space-y-3 no-print" onKeyDown={onKeyDown}>
        <button
          type="button"
          onClick={() => setFlipped((f) => !f)}
          aria-label={flipped ? "Showing answer. Click to see the front." : "Showing front. Click to see the answer."}
          className={`w-full min-h-48 rounded-xl border-2 p-6 flex flex-col items-center justify-center text-center gap-3 transition-colors ${
            flipped ? "border-accent bg-card" : "border-line bg-background hover:border-accent"
          }`}
        >
          <span className="text-xs uppercase tracking-wide text-muted">
            {flipped ? "Answer" : "Front"}
          </span>
          <span className={flipped ? "text-base" : "text-xl font-semibold"} aria-live="polite">
            {flipped ? card.back : card.front}
          </span>
          <span className="text-xs text-muted">Tap to flip</span>
        </button>

        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => go(-1)}
            className="rounded-lg border border-line px-4 py-2.5 font-medium"
            aria-label="Previous card"
          >
            ← Prev
          </button>
          <span className="text-sm text-muted" aria-live="polite">
            {index + 1} / {deck.length}
          </span>
          <button
            type="button"
            onClick={() => go(1)}
            className="rounded-lg border border-line px-4 py-2.5 font-medium"
            aria-label="Next card"
          >
            Next →
          </button>
        </div>
        <div className="text-center">
          <button type="button" onClick={shuffle} className="text-sm text-accent font-medium underline-offset-2 hover:underline">
            🔀 Shuffle deck
          </button>
        </div>
      </div>

      {/* Printed version: every card as a two-column list */}
      <table className="hidden print:table w-full text-sm border-collapse">
        <tbody>
          {cards.map((c, i) => (
            <tr key={i} className="print-break-avoid">
              <td className="border border-line p-2 align-top w-2/5 font-semibold">{c.front}</td>
              <td className="border border-line p-2 align-top">{c.back}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
