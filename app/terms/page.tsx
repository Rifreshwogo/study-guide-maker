import type { Metadata } from "next";
import Link from "next/link";
import { APP_CONFIG } from "@/app.config";
import { ContactLine, LegalPage, LegalSection } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Terms of Use · Study Guide Maker",
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Use">
      <p>
        By using Study Guide Maker you agree to these terms. They&apos;re short, so please read them.
      </p>

      <LegalSection title="It's free, and it's for studying">
        <p>
          Study Guide Maker is free and for personal, non-commercial learning. Use it to study, not
          to get answers for graded homework or tests your teacher expects you to do yourself.
          Follow your school&apos;s rules on AI tools.
        </p>
      </LegalSection>

      <LegalSection title="AI can be wrong">
        <p>
          Guides are written by AI and can contain mistakes, even after they&apos;re checked.
          Double-check anything important with your textbook or teacher. Guides are study help, not
          professional advice. They aren&apos;t medical, legal, or financial advice.
        </p>
      </LegalSection>

      <LegalSection title="What you upload">
        <ul>
          <li>Only upload notes you&apos;re allowed to share, and keep personal details out of them.</li>
          <li>
            Don&apos;t upload anything harmful, illegal, or that contains other people&apos;s private
            information.
          </li>
          <li>
            Don&apos;t try to overload, break into, or misuse the site. Each visitor can make{" "}
            {APP_CONFIG.rateLimitPerHour} guides an hour.
          </li>
        </ul>
        <p>
          How your uploads are handled is explained in the{" "}
          <Link href="/privacy" className="text-accent underline underline-offset-2">
            Privacy Policy
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection title="Sources and copyright">
        <p>
          Guides draw on openly licensed textbooks and public web pages, and every guide lists its
          sources with their licenses. Many of those textbooks allow only non-commercial use, so
          you may use your guides for your own studying and share them freely, but not sell them.
        </p>
      </LegalSection>

      <LegalSection title="Age">
        <p>
          You should be at least {APP_CONFIG.minimumAge} to use this site on your own. Younger
          students should use it with a parent, guardian, or teacher.
        </p>
      </LegalSection>

      <LegalSection title="No guarantees">
        <p>
          The site runs on one computer and may be slow, busy, or offline at times. It&apos;s
          provided &ldquo;as is,&rdquo; without warranties, and the site owner isn&apos;t responsible for
          grades, decisions, or losses based on a guide. The site, these terms, or the{" "}
          <Link href="/privacy" className="text-accent underline underline-offset-2">
            Privacy Policy
          </Link>{" "}
          may change or stop at any time; the date at the top shows the latest version.
        </p>
        <ContactLine />
      </LegalSection>
    </LegalPage>
  );
}
