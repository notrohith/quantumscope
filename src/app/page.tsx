import Link from "next/link";
import {
  Orbit,
  Activity,
  Radar,
  GitCompareArrows,
  BookOpen,
} from "lucide-react";
import { PageHeader, ResultCard } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { ExperimentPipeline } from "@/components/diagrams";
import { OverviewActivity } from "@/components/overview-activity";
const quickExperiments = [
  {
    href: "/entanglement",
    title: "Create Bell Pair",
    description: "Prepare and inspect an entangled state.",
    icon: Orbit,
    color: "violet",
  },
  {
    href: "/noise",
    title: "Explore Noise",
    description: "Trace how correlations change.",
    icon: Activity,
    color: "cyan",
  },
  {
    href: "/illumination",
    title: "Detect Weak Target",
    description: "Explore signal–idler detection.",
    icon: Radar,
    color: "blue",
  },
  {
    href: "/comparison",
    title: "Compare Quantum vs Control",
    description: "Compare two sensing strategies.",
    icon: GitCompareArrows,
    color: "lavender",
  },
];
export default function Overview() {
  return (
    <>
      <PageHeader
        eyebrow="EXPLORE. SIMULATE. UNDERSTAND."
        title="Quantum Correlation & Illumination Simulator"
        description="Explore entanglement, model quantum noise, simulate target detection, and compare quantum-correlated sensing with an unentangled control strategy."
        action={
          <Button asChild variant="outline">
            <Link href="/methodology">
              <BookOpen size={15} />
              Methodology
            </Link>
          </Button>
        }
      />
      <OverviewActivity />
      <ResultCard
        title="Experiment Pipeline"
        description="Educational schematic · From an entangled pair to a target decision"
      >
        <ExperimentPipeline />
      </ResultCard>
      <div className="overview-shortcuts">
        <section className="quick-section">
          <div className="section-heading">
            <h2>Quick Experiments</h2>
            <span className="micro">CHOOSE A STARTING POINT</span>
          </div>
          <div className="quick-grid">
            {quickExperiments.map(
              ({ href, title, description, icon: Icon, color }) => (
                <Link href={href} key={href} className="quick-card">
                  <span className={`quick-icon ${color}`}>
                    <Icon size={22} />
                  </span>
                  <h3>{title}</h3>
                  <p>{description}</p>
                  <span className="quick-link">Open experiment</span>
                </Link>
              ),
            )}
          </div>
        </section>
      </div>
    </>
  );
}
