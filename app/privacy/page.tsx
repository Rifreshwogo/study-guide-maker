import type { Metadata } from "next";
import Link from "next/link";
import { APP_CONFIG } from "@/app.config";
import { ContactLine, LegalPage, LegalSection } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy · Study Guide Maker",
};

// Keep this page in step with the code: lib/jobs.ts (what's kept and for how long),
// lib/rateLimit.ts (hashed IPs), lib/local/web.ts (web searches), lib/local/status.ts.
export default function PrivacyPage() {
  const keepMinutes = 30;
  return (
    <LegalPage title="Privacy Policy">
      <p>
        Study Guide Maker is a free study tool. It has no accounts, no ads, and no tracking. This
        page explains what happens to what you type and upload.
      </p>

      <LegalSection title="What you give us">
        <ul>
          <li>The class or subject and the topic you type.</li>
          <li>Photos of your notes, if you add any.</li>
          <li>Today&apos;s date from your device, so the study plan counts down to your test.</li>
        </ul>
        <p>
          We don&apos;t ask for your name, email, school, or any account. Please don&apos;t type your
          name or school, and avoid photos that show them.
        </p>
      </LegalSection>

      <LegalSection title="How it's used">
        <p>
          Your request is used only to make your study guide. AI models running on the site
          owner&apos;s own computer read it. It is <strong>not</strong> sent to any outside AI company
          and is never used to train AI models.
        </p>
        <p>
          To find sources, the AI writes a few short web searches based on your topic and notes
          (for example &ldquo;cardiovascular system heart valves&rdquo;). These searches go to public
          search engines from the site&apos;s computer, not from yours, so they aren&apos;t linked to
          you. Your photos are never sent anywhere.
        </p>
      </LegalSection>

      <LegalSection title="What we keep, and for how long">
        <ul>
          <li>
            <strong>Photos</strong> are kept in memory only while your guide is being made, then
            deleted. They are never saved to disk.
          </li>
          <li>
            <strong>Your request and finished guide</strong> are kept in memory for {keepMinutes}{" "}
            minutes after the guide is done, so you can see it, then deleted. Restarting the site
            also deletes them.
          </li>
          <li>
            <strong>Your IP address</strong> is scrambled (hashed) and kept for up to one hour to
            limit each visitor to {APP_CONFIG.rateLimitPerHour} guides an hour. The original address
            is never stored.
          </li>
          <li>
            <strong>Logs</strong> record only timing and errors, never what you typed or uploaded.
          </li>
        </ul>
        <p>
          Because nothing about you is stored after that, there&apos;s nothing to delete later. If
          you want a guide gone sooner, just close the page; it disappears on its own within{" "}
          {keepMinutes} minutes.
        </p>
      </LegalSection>

      <LegalSection title="Cookies and tracking">
        <p>
          This site doesn&apos;t use cookies, analytics, ads, or tracking pixels, and doesn&apos;t sell
          or share your information. Fonts are served from this site, not from Google.
        </p>
      </LegalSection>

      <LegalSection title="Other services involved">
        <p>
          The site reaches the internet through Cloudflare, which sees your IP address the way any
          website host does and handles it under{" "}
          <a
            href="https://www.cloudflare.com/privacypolicy/"
            className="text-accent underline underline-offset-2"
          >
            Cloudflare&apos;s privacy policy
          </a>
          . Links in your guide go to textbook and web sources, which have their own policies.
        </p>
      </LegalSection>

      <LegalSection title="Kids and teens">
        <p>
          This site is meant for students {APP_CONFIG.minimumAge} and older. If you&apos;re younger,
          please use it with a parent, guardian, or teacher, and don&apos;t upload photos. We
          don&apos;t knowingly collect personal information from children under 13; if you think a
          child has shared some, contact us and we&apos;ll make sure it&apos;s deleted.
        </p>
      </LegalSection>

      <LegalSection title="Changes">
        <p>
          If this policy changes, the date at the top will change too. See also the{" "}
          <Link href="/terms" className="text-accent underline underline-offset-2">
            Terms of Use
          </Link>
          .
        </p>
        <ContactLine />
      </LegalSection>
    </LegalPage>
  );
}
