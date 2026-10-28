import type { StudyGuide } from "@/lib/schema";

export default function Traps({ traps }: { traps: StudyGuide["traps"] }) {
  return (
    <ul className="space-y-3">
      {traps.map((t, i) => (
        <li key={i} className="rounded-lg border border-line bg-card p-4 print-break-avoid">
          <p className="font-medium">
            <span aria-hidden className="mr-1">⚠️</span>
            {t.trap}
          </p>
          <p className="mt-1 text-[0.95rem] text-muted">
            <span className="font-semibold text-foreground">How to avoid it: </span>
            {t.fix}
          </p>
        </li>
      ))}
    </ul>
  );
}
