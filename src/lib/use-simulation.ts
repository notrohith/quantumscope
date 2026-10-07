"use client";
import { useState } from "react";
import type { SimulationResponse } from "./types";
export function useSimulation<T>() {
  const [response, setResponse] = useState<SimulationResponse<T> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [status, setStatus] = useState("");
  const [runs, setRuns] = useState(0);
  async function run(
    request: () => Promise<SimulationResponse<T>>,
    summary: string,
  ) {
    setLoading(true);
    setError(undefined);
    setStatus(
      "Run in progress. Any displayed result belongs to the previous completed run.",
    );
    try {
      const next = await request();
      if (next.source !== "api")
        throw new Error(
          "Only live backend responses are accepted. No fixture was displayed.",
        );
      setResponse(next);
      setRuns(runs + 1);
      setStatus(`Live simulation completed · Run ${runs + 1} · ${summary}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load results.");
      setStatus(
        "Run failed. Any displayed results are from the previous successful run.",
      );
    } finally {
      setLoading(false);
    }
  }
  return { response, loading, error, status, run };
}
