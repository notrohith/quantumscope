import Link from "next/link";
import { Button } from "@/components/ui/button";
export default function NotFound() {
  return (
    <div className="empty-state">
      <h1>Experiment not found</h1>
      <p>Choose a lab from the navigation or return to the overview.</p>
      <Button asChild>
        <Link href="/">Back to overview</Link>
      </Button>
    </div>
  );
}
