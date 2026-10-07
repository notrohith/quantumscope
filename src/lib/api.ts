import { saveLiveRun } from "./history-store";
import { noiseModelIds } from "./noise-models";
import { bellStateIds } from "./bell-states";
import type { z } from "zod";
import {
  liveEntanglementSchema,
  healthSchema,
  liveNoiseSchema,
  liveIlluminationSchema,
  liveComparisonSchema,
} from "./schemas";
import type {
  ComparisonResult,
  ComparisonParameters,
  LiveComparisonResult,
  EntanglementParameters,
  EntanglementResult,
  LiveEntanglementResult,
  IlluminationParameters,
  IlluminationResult,
  LiveIlluminationResult,
  NoiseParameters,
  NoiseSimulationResult,
  LiveNoiseResult,
  SimulationResponse,
} from "./types";
export const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
export function publishBackendStatus(connected: boolean) {
  if (
    typeof window !== "undefined" &&
    typeof window.dispatchEvent === "function"
  )
    window.dispatchEvent(
      new CustomEvent("quantumscope:backend-status", { detail: connected }),
    );
}
export const REQUEST_TIMEOUTS = {
  entanglement: 20000,
  noise: 45000,
  illumination: 45000,
  compare: 60000,
} as const;
async function simulate<T>(
  endpoint: keyof typeof REQUEST_TIMEOUTS,
  parameters: object,
  schema: z.ZodType<T>,
): Promise<SimulationResponse<T>> {
  if (!API_URL)
    throw new Error(
      "Backend not configured. Set NEXT_PUBLIC_API_URL and restart or rebuild the frontend.",
    );
  let response: Response;
  try {
    response = await fetch(`${API_URL}/simulate/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parameters),
      signal: AbortSignal.timeout(REQUEST_TIMEOUTS[endpoint]),
    });
  } catch (error) {
    publishBackendStatus(false);
    const timeout =
      error instanceof Error &&
      ["TimeoutError", "AbortError"].includes(error.name);
    throw new Error(
      timeout
        ? `Simulation timed out after ${REQUEST_TIMEOUTS[endpoint] / 1000} seconds. Check backend status and retry; no new results were saved.`
        : "Cannot reach the simulation backend. Check the connection and retry. No demo data was substituted.",
    );
  }
  publishBackendStatus(true);
  if (!response.ok)
    throw new Error(
      response.status === 422
        ? "The backend rejected the experiment parameters (validation error). Check the settings and retry."
        : `Simulation server failed (HTTP ${response.status}). Retry the run; no new results were saved.`,
    );
  try {
    return { source: "api", result: schema.parse(await response.json()) };
  } catch {
    throw new Error(
      "Backend response failed validation. No new result was accepted or saved; no demo data was substituted.",
    );
  }
}
export async function runEntanglementSimulation(
  parameters: EntanglementParameters,
): Promise<SimulationResponse<EntanglementResult | LiveEntanglementResult>> {
  const response = await simulate<LiveEntanglementResult>(
    "entanglement",
    { state: bellStateIds[parameters.state], shots: parameters.shots },
    liveEntanglementSchema,
  );
  if (
    response.result.state !== bellStateIds[parameters.state] ||
    response.result.shots !== parameters.shots
  ) {
    throw new Error(
      "Backend response does not match the submitted state and shots.",
    );
  }
  saveLiveRun({ type: "Entanglement", result: response.result });
  return response;
}
export async function checkBackendHealth(
  signal?: AbortSignal,
): Promise<boolean> {
  if (!API_URL) return false;
  try {
    const timeout = AbortSignal.timeout(5000);
    const response = await fetch(`${API_URL}/health`, {
      cache: "no-store",
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    });
    return response.ok && healthSchema.safeParse(await response.json()).success;
  } catch {
    return false;
  }
}
export async function runNoiseSimulation(
  parameters: NoiseParameters,
): Promise<SimulationResponse<NoiseSimulationResult | LiveNoiseResult>> {
  const submitted = {
    state: bellStateIds[parameters.state ?? "Bell Φ+"],
    model: noiseModelIds[parameters.model],
    strength: parameters.strength,
    shots: parameters.shots,
    seed: parameters.seed ?? 42,
  };
  const response = await simulate<LiveNoiseResult>(
    "noise",
    submitted,
    liveNoiseSchema,
  );
  if (
    Object.entries(submitted).some(
      ([key, value]) =>
        response.result[key as keyof typeof submitted] !== value,
    )
  ) {
    throw new Error(
      "Backend response does not match the submitted noise parameters.",
    );
  }
  saveLiveRun({ type: "Noise", result: response.result });
  return response;
}
export async function runIlluminationSimulation(
  parameters: IlluminationParameters,
): Promise<SimulationResponse<IlluminationResult | LiveIlluminationResult>> {
  const submitted = {
    ...parameters,
    trials: parameters.trials ?? 200,
    seed: parameters.seed ?? 42,
  };
  const response = await simulate<LiveIlluminationResult>(
    "illumination",
    submitted,
    liveIlluminationSchema,
  );
  if (
    Object.entries(submitted).some(
      ([key, value]) =>
        response.result[key as keyof typeof submitted] !== value,
    )
  ) {
    throw new Error(
      "Backend response does not match the submitted illumination parameters.",
    );
  }
  saveLiveRun({ type: "Illumination", result: response.result });
  return response;
}
export async function runComparisonSimulation(
  parameters: ComparisonParameters,
): Promise<SimulationResponse<ComparisonResult | LiveComparisonResult>> {
  const submitted = { ...parameters, seed: parameters.seed ?? 42 };
  const response = await simulate<LiveComparisonResult>(
    "compare",
    submitted,
    liveComparisonSchema,
  );
  if (
    Object.entries(submitted).some(
      ([key, value]) =>
        response.result[key as keyof typeof submitted] !== value,
    )
  )
    throw new Error("Comparison response does not match submitted parameters.");
  saveLiveRun({ type: "Comparison", result: response.result });
  return response;
}
