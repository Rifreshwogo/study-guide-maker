"use client";

import { useState } from "react";
import type { StudyGuide } from "@/lib/schema";

type Question = StudyGuide["quiz"][number];
const LETTERS = ["A", "B", "C", "D"];

export default function Quiz({ questions }: { questions: Question[] }) {
  // answers[i] = chosen choice index, or undefined if not answered yet
  const [answers, setAnswers] = useState<(number | undefined)[]>(() => questions.map(() => undefined));
  const [round, setRound] = useState(0); // bumps on retake to reset radio groups

  const answered = answers.filter((a) => a !== undefined).length;
  const correct = answers.filter((a, i) => a === questions[i].answerIndex).length;
  const done = answered === questions.length;

  function choose(qi: number, ci: number) {
    setAnswers((prev) => (prev[qi] !== undefined ? prev : prev.map((a, i) => (i === qi ? ci : a))));
  }

  function retake() {
    setAnswers(questions.map(() => undefined));
    setRound((r) => r + 1);
  }

  return (
    <div className="space-y-5">
      <ol className="space-y-5">
        {questions.map((q, qi) => {
          const chosen = answers[qi];
          const isAnswered = chosen !== undefined;
          const isRight = chosen === q.answerIndex;
          return (
            <li key={`${round}-${qi}`} className="rounded-lg border border-line bg-card p-4 print-break-avoid">
              <fieldset>
                <legend className="font-medium mb-3">
                  <span className="text-muted mr-1">{qi + 1}.</span> {q.question}
                </legend>
                <div className="space-y-2">
                  {q.choices.map((choice, ci) => {
                    const isCorrectChoice = ci === q.answerIndex;
                    let style = "border-line hover:border-accent";
                    if (isAnswered) {
                      if (isCorrectChoice) style = "border-green-600 bg-green-50 dark:bg-green-950/40";
                      else if (ci === chosen) style = "border-red-600 bg-red-50 dark:bg-red-950/40";
                      else style = "border-line opacity-70";
                    }
                    return (
                      <label
                        key={ci}
                        className={`flex items-start gap-3 rounded-lg border-2 px-3 py-2.5 print:border print:border-line ${
                          isAnswered ? "cursor-default" : "cursor-pointer"
                        } ${style}`}
                      >
                        <input
                          type="radio"
                          name={`q-${round}-${qi}`}
                          checked={chosen === ci}
                          disabled={isAnswered}
                          onChange={() => choose(qi, ci)}
                          className="mt-1 accent-[var(--accent)] no-print"
                        />
                        <span>
                          <span className="font-semibold mr-1">{LETTERS[ci]}.</span>
                          {choice}
                          {isAnswered && isCorrectChoice && (
                            <span className="ml-2 text-green-700 dark:text-green-400 font-semibold">✓ Correct answer</span>
                          )}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              {isAnswered && (
                <div
                  role="status"
                  className={`mt-3 rounded-lg p-3 text-sm no-print ${
                    isRight
                      ? "bg-green-50 text-green-900 dark:bg-green-950/40 dark:text-green-200"
                      : "bg-red-50 text-red-900 dark:bg-red-950/40 dark:text-red-200"
                  }`}
                >
                  <p className="font-semibold">
                    {isRight ? "Nice, that's right!" : `Not quite. The answer is ${LETTERS[q.answerIndex]}.`}
                  </p>
                  <p className="mt-1">{q.explanation}</p>
                </div>
              )}
            </li>
          );
        })}
      </ol>

      <div className="rounded-lg border border-line p-4 flex flex-wrap items-center justify-between gap-3 no-print" aria-live="polite">
        <span className="font-semibold">
          {done
            ? `Score: ${correct} / ${questions.length}${correct === questions.length ? " 🎉" : ""}`
            : `${answered} of ${questions.length} answered · ${correct} correct so far`}
        </span>
        {answered > 0 && (
          <button type="button" onClick={retake} className="rounded-lg border border-line px-4 py-2 font-medium">
            Retake quiz
          </button>
        )}
      </div>

      {/* Answer key, printed at the end of the quiz */}
      <div className="hidden print:block print-break-avoid">
        <h3 className="font-semibold mt-4 mb-2">Answer key</h3>
        <ol className="text-sm space-y-1 list-decimal pl-5">
          {questions.map((q, i) => (
            <li key={i}>
              <strong>{LETTERS[q.answerIndex]}</strong> — {q.explanation}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
