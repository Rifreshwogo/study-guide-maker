"use client";

import { useState } from "react";
import type { StudyGuide } from "@/lib/schema";

export default function KeyTerms({ groups }: { groups: StudyGuide["termGroups"] }) {
  const [highYieldOnly, setHighYieldOnly] = useState(false);
  const total = groups.reduce((n, g) => n + g.terms.length, 0);
  const hy = groups.reduce((n, g) => n + g.terms.filter((t) => t.highYield).length, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 no-print">
        <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={highYieldOnly}
            onChange={(e) => setHighYieldOnly(e.target.checked)}
            className="h-4 w-4 accent-[var(--accent)]"
          />
          Show only high-yield terms ({hy} of {total})
        </label>
      </div>

      {groups.map((group, gi) => {
        const terms = highYieldOnly ? group.terms.filter((t) => t.highYield) : group.terms;
        if (terms.length === 0) return null;
        return (
          <div key={gi} className="rounded-lg border border-line bg-card p-4 print-break-avoid">
            <h3 className="font-semibold mb-3">{group.theme}</h3>
            <dl className="space-y-3">
              {terms.map((t, ti) => (
                <div key={ti}>
                  <dt className="font-medium flex flex-wrap items-center gap-2">
                    {t.term}
                    {t.highYield && (
                      <span className="rounded-full bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200 px-2 py-0.5 text-xs font-semibold print:border print:border-black">
                        ★ High-yield
                      </span>
                    )}
                  </dt>
                  <dd className="text-[0.95rem] text-muted mt-0.5">{t.definition}</dd>
                </div>
              ))}
            </dl>
          </div>
        );
      })}
    </div>
  );
}
