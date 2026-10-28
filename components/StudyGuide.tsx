"use client";

import type { GuideResponse } from "@/lib/schema";
import Section from "./guide/Section";
import KeyTerms from "./guide/KeyTerms";
import Flashcards from "./guide/Flashcards";
import Quiz from "./guide/Quiz";
import StudyPlan from "./guide/StudyPlan";
import Traps from "./guide/Traps";
import Sources from "./guide/Sources";

const SECTIONS = [
  { id: "terms", label: "Key terms" },
  { id: "flashcards", label: "Flashcards" },
  { id: "quiz", label: "Quiz" },
  { id: "plan", label: "Study plan" },
  { id: "traps", label: "Traps" },
  { id: "sources", label: "Sources" },
];

export default function StudyGuide({
  result,
  onMakeAnother,
}: {
  result: GuideResponse;
  onMakeAnother: () => void;
}) {
  const { guide, books, className } = result;

  return (
    <article className="space-y-10">
      <header className="space-y-3">
        <p className="text-sm font-medium text-accent">{className}</p>
        <h1 className="text-2xl sm:text-3xl font-bold leading-tight">{guide.title}</h1>
        <p className="text-muted">{guide.overview}</p>
        {guide.usedStudentNotes && (
          <p className="inline-block rounded-full bg-card border border-line px-3 py-1 text-xs font-medium">
            📷 Focused on your class notes
          </p>
        )}

        <div className="flex flex-wrap gap-2 pt-1 no-print">
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-lg bg-accent px-4 py-2.5 font-semibold text-accent-fg"
          >
            🖨️ Print / Save as PDF
          </button>
          <button
            type="button"
            onClick={onMakeAnother}
            className="rounded-lg border border-line px-4 py-2.5 font-medium"
          >
            Make another guide
          </button>
        </div>
      </header>

      <nav
        aria-label="Guide sections"
        className="no-print sticky top-0 z-10 -mx-4 px-4 py-2 bg-background/95 backdrop-blur border-b border-line overflow-x-auto"
      >
        <ul className="flex gap-1 whitespace-nowrap text-sm">
          {SECTIONS.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="inline-block rounded-full px-3 py-1.5 hover:bg-card font-medium">
                {s.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <Section id="terms" title="Key terms" icon="📚">
        <KeyTerms groups={guide.termGroups} />
      </Section>

      <Section id="flashcards" title="Flashcards" icon="🃏">
        <Flashcards cards={guide.flashcards} />
      </Section>

      <Section id="quiz" title="Practice quiz" icon="✅">
        <Quiz questions={guide.quiz} />
      </Section>

      <Section id="plan" title="Study plan" icon="🗓️">
        <StudyPlan plan={guide.studyPlan} />
      </Section>

      <Section id="traps" title="Common traps" icon="🪤">
        <Traps traps={guide.traps} />
      </Section>

      <Section id="sources" title="Sources" icon="🔗">
        <Sources books={books} webSources={guide.webSources} usedNotes={guide.usedStudentNotes} />
      </Section>

      <div className="no-print pt-2">
        <button
          type="button"
          onClick={onMakeAnother}
          className="w-full rounded-lg border border-line px-4 py-3 font-semibold"
        >
          Make another guide
        </button>
      </div>
    </article>
  );
}
