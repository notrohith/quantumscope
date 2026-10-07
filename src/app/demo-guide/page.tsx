import Link from "next/link";
import { PageHeader, ResultCard } from "@/components/shared";
export const metadata = { title: "Demo Guide" };
const steps = [
  {
    title: "Generate Bell pair",
    href: "/entanglement",
    text: "Start with Φ+. Run the simulation and explain concurrence and the sampled 00/11 outcomes. Change the state to preview its preparation gates; run again to update the result.",
  },
  {
    title: "Add noise",
    href: "/noise",
    text: "Run Depolarizing, then Readout Error. Contrast changes to the quantum state with changes only to recorded measurement bits.",
  },
  {
    title: "Detect target",
    href: "/illumination",
    text: "Run a target-present observation. Follow the signal and stored idler paths; distinguish the single Bell-match score from detection rates across repeated trials.",
  },
  {
    title: "Compare strategies",
    href: "/comparison",
    text: "Compare both receivers under matched settings. Show estimated errors and ROC curves. Equal errors or lower control error are valid outcomes; no advantage is guaranteed.",
  },
];
export default function DemoGuide() {
  return (
    <>
      <PageHeader
        eyebrow="PRESENTATION / FOUR EXPERIMENTS"
        title="Demo Guide"
        description="A short path through the live platform. Check that the sidebar says Connected before starting."
      />
      <ol className="demo-guide-steps">
        {steps.map((step, i) => (
          <li key={step.href}>
            <ResultCard title={`${i + 1}. ${step.title}`}>
              <p>{step.text}</p>
              <Link className="guide-link" href={step.href}>
                Open experiment →
              </Link>
            </ResultCard>
          </li>
        ))}
      </ol>
      <ResultCard title="Finish with your results">
        <p>
          Open Results to review the recorded configurations and seeds, then
          export CSV. History belongs to this browser; export before clearing
          storage. If a run fails, its error is visible and any older result is
          labeled.
        </p>
        <Link className="guide-link" href="/results">
          Review and export Results →
        </Link>
      </ResultCard>
      <p className="chart-note">
        “Demo” here means a presentation sequence. All four labs require the
        live backend; no offline fixtures are substituted.
      </p>
    </>
  );
}
