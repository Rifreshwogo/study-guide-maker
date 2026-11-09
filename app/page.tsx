import StudyApp from "@/components/StudyApp";

export default function Home() {
  // Guides are made by local models on the owner's Mac, which Vercel can't reach.
  // If this code is ever deployed there, show a notice instead of a broken form.
  if (process.env.VERCEL) {
    return (
      <div className="py-16 space-y-4 text-center">
        <p className="text-4xl" aria-hidden>
          📘
        </p>
        <h1 className="text-2xl font-bold">Study Guide Maker has moved</h1>
        <p className="text-muted">
          The site now runs on its own study guide team. Ask whoever shared this link for the new address.
        </p>
      </div>
    );
  }
  return <StudyApp />;
}
