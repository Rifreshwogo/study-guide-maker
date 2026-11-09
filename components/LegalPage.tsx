import Link from "next/link";
import { APP_CONFIG } from "@/app.config";

/** Shared layout for the Privacy and Terms pages. */
export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <article className="space-y-6 leading-relaxed">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-sm text-muted">Last updated {APP_CONFIG.policiesUpdated}</p>
      </div>
      {children}
      <p className="pt-2">
        <Link href="/" className="text-accent font-medium underline underline-offset-2">
          ← Back to Study Guide Maker
        </Link>
      </p>
    </article>
  );
}

export function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="space-y-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1">{children}</div>
    </section>
  );
}

/** How to reach the site owner, or nothing if no contact is set. */
export function ContactLine() {
  const email = APP_CONFIG.contactEmail;
  if (!email) return null;
  return (
    <p>
      Questions? Email{" "}
      <a href={`mailto:${email}`} className="text-accent underline underline-offset-2">
        {email}
      </a>
      .
    </p>
  );
}
