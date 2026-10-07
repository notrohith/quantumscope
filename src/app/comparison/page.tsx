import { PageHeader } from "@/components/shared";
import { ExperimentComparison } from "@/components/experiment-comparison";
export const metadata = { title: "Quantum vs Control" };
export default function Page() {
  return (
    <>
      <PageHeader
        eyebrow="EXPERIMENT 04 / COMPARATIVE ANALYSIS"
        title="Quantum vs Control"
        description="Compare correlation-assisted detection with an unentangled control strategy under the same simulated environmental conditions."
      />
      <ExperimentComparison />
    </>
  );
}
