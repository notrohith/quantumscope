import { PageHeader } from "@/components/shared";
import { ResultsTable } from "@/components/results-table";
export const metadata = { title: "Experiment Results" };
export default function Page() {
  return (
    <>
      <PageHeader
        eyebrow="WORKSPACE / EXPERIMENT LOG"
        title="Experiment Results"
        description="Browse, filter, and export successful live simulations saved in this browser. Timestamps use your local time."
      />
      <ResultsTable />
    </>
  );
}
