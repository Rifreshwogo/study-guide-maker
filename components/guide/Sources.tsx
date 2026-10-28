import type { BookAttribution, StudyGuide } from "@/lib/schema";

/** Only http(s) links are rendered as links. */
function safeHref(url: string): string | undefined {
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : undefined;
  } catch {
    return undefined;
  }
}

function ExtLink({ href, children }: { href: string; children: React.ReactNode }) {
  const safe = safeHref(href);
  if (!safe) return <span>{children}</span>;
  return (
    <a
      href={safe}
      target="_blank"
      rel="noopener noreferrer"
      className="text-accent underline underline-offset-2 break-words"
    >
      {children}
    </a>
  );
}

export default function Sources({
  books,
  webSources,
  usedNotes,
}: {
  books: BookAttribution[];
  webSources: StudyGuide["webSources"];
  usedNotes: boolean;
}) {
  return (
    <div className="space-y-5 text-[0.95rem]">
      {books.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold">Open textbooks</h3>
          <ul className="space-y-3">
            {books.map((b) => (
              <li key={b.title} className="rounded-lg border border-line bg-card p-4 print-break-avoid">
                <p>
                  <ExtLink href={b.freeUrl}>
                    <cite className="not-italic font-semibold">{b.title}</cite>
                  </ExtLink>{" "}
                  by {b.authors}, {b.publisher}.
                </p>
                <p className="mt-1 text-muted">
                  Licensed under <ExtLink href={b.licenseUrl}>{b.licenseName}</ExtLink>. Free to read
                  at <ExtLink href={b.freeUrl}>{b.freeUrl.replace(/^https?:\/\//, "")}</ExtLink>.
                  This guide is an AI-written adaptation; the book&apos;s authors don&apos;t endorse it.
                  {/-SA\b/.test(b.licenseName) && (
                    <> Material adapted from this book is shared under the same license.</>
                  )}
                </p>
                {b.notice && <p className="mt-1 text-muted">{b.notice}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {webSources.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-semibold">Websites</h3>
          <ul className="list-disc pl-5 space-y-1.5">
            {webSources.map((s, i) => (
              <li key={i}>
                <ExtLink href={s.url}>{s.title}</ExtLink>
                <span className="hidden print:inline text-muted"> — {s.url}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {usedNotes && <p className="text-muted">Also based on the class notes you uploaded.</p>}

      {books.length === 0 && webSources.length === 0 && !usedNotes && (
        <p className="text-muted">
          No outside sources were recorded for this guide. Double-check it against your class materials.
        </p>
      )}
    </div>
  );
}
