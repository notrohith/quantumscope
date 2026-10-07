import { PageHeader } from "@/components/shared";
import { NoiseLab } from "@/components/labs/noise-lab";
export const metadata = { title: "Noise Lab" };
export default function Page() {
  return (
    <>
      <PageHeader
        eyebrow="EXPERIMENT 02 / DECOHERENCE"
        title="Noise Lab"
        description="Study how environmental and measurement noise degrade quantum correlations."
      />
      <NoiseLab />
    </>
  );
}
