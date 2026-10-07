import { PageHeader } from "@/components/shared";
import { IlluminationLab } from "@/components/labs/illumination-lab";
export const metadata = { title: "Quantum Illumination" };
export default function Page() {
  return (
    <>
      <PageHeader
        eyebrow="EXPERIMENT 03 / TARGET DETECTION"
        title="Quantum Illumination"
        description="Explore a simplified qubit-based model of correlation-assisted target detection."
      />
      <IlluminationLab />
    </>
  );
}
