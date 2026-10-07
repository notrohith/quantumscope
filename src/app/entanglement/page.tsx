import { PageHeader } from "@/components/shared";
import { EntanglementLab } from "@/components/labs/entanglement-lab";
export const metadata = { title: "Entanglement Lab" };
export default function Page() {
  return (
    <>
      <PageHeader
        eyebrow="EXPERIMENT 01 / CORRELATIONS"
        title="Entanglement Lab"
        description="Prepare two-qubit entangled states and inspect their correlation and entanglement metrics."
      />
      <EntanglementLab />
    </>
  );
}
