import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import "./globals.css";
import { PlatformProvider } from "@/components/platform-provider";
export const metadata: Metadata = {
  title: {
    default: "QuantumScope · Quantum Simulation Platform",
    template: "%s · QuantumScope",
  },
  icons: { icon: "/icon.svg" },
  description:
    "An interactive simulation platform for exploring quantum entanglement, environmental noise, correlation degradation, and qubit-based quantum illumination experiments. Four live Qiskit Aer labs with browser-local experiment history.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <PlatformProvider>
          <AppShell>{children}</AppShell>
        </PlatformProvider>
      </body>
    </html>
  );
}
