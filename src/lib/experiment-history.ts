import { z } from "zod";
import { bellStateIds } from "./bell-states";
import { noiseModelIds } from "./noise-models";
import type {
  LiveEntanglementResult,
  LiveNoiseResult,
  LiveIlluminationResult,
  LiveComparisonResult,
} from "./types";

export const HISTORY_KEY = "quantumscope.experiments";
export const HISTORY_VERSION = 1;
export const HISTORY_LIMIT = 100;
export const experimentTypes = [
  "Entanglement",
  "Noise",
  "Illumination",
  "Comparison",
] as const;
const probability = z.number().min(0).max(1);
const strategy = z.object({
  detectionProbability: probability,
  falseAlarmProbability: probability,
  errorProbability: probability,
  threshold: z.number().finite(),
  auc: probability,
});
const recordSchema = z
  .object({
    id: z.string().uuid(),
    timestamp: z.iso.datetime(),
    experimentType: z.enum(experimentTypes),
    engine: z.literal("qiskit-aer"),
    provenance: z.literal("LIVE SIMULATION"),
    model: z.enum([
      "ideal-bell",
      "noisy-bell",
      "qubit-illumination",
      "qubit-comparison",
    ]),
    shots: z.number().int().positive(),
    seed: z.number().int().nonnegative(),
    state: z
      .enum(["phi_plus", "phi_minus", "psi_plus", "psi_minus"])
      .optional(),
    noiseModel: z
      .enum([
        "depolarizing",
        "amplitude_damping",
        "phase_damping",
        "readout_error",
      ])
      .optional(),
    noiseStrength: probability.optional(),
    reflectivity: probability.optional(),
    backgroundNoise: probability.optional(),
    channelNoise: probability.optional(),
    trials: z.number().int().positive().optional(),
    targetPresent: z.boolean().optional(),
    concurrence: probability.optional(),
    fidelity: probability.optional(),
    quantumZZ: z.number().min(-1).max(1).optional(),
    measuredZZ: z.number().min(-1).max(1).optional(),
    detectionProbability: probability.optional(),
    falseAlarmProbability: probability.optional(),
    errorProbability: probability.optional(),
    receiverScore: z.number().finite().optional(),
    threshold: z.number().finite().optional(),
    decision: z.enum(["target", "no_target"]).optional(),
    quantum: strategy.optional(),
    control: strategy.optional(),
    thresholdMethod: z.literal("exact-model-midpoint").optional(),
    trialSampling: z.literal("exact-probability-binomial").optional(),
    priors: z.literal("equal").optional(),
    bitOrder: z.literal("q0q1").optional(),
  })
  .superRefine((r, ctx) => {
    const required: Record<typeof r.experimentType, string[]> = {
      Entanglement: [
        "state",
        "concurrence",
        "fidelity",
        "quantumZZ",
        "measuredZZ",
      ],
      Noise: [
        "state",
        "noiseModel",
        "noiseStrength",
        "concurrence",
        "fidelity",
        "quantumZZ",
        "measuredZZ",
      ],
      Illumination: [
        "reflectivity",
        "backgroundNoise",
        "channelNoise",
        "trials",
        "targetPresent",
        "detectionProbability",
        "falseAlarmProbability",
        "errorProbability",
        "thresholdMethod",
        "trialSampling",
      ],
      Comparison: [
        "reflectivity",
        "backgroundNoise",
        "channelNoise",
        "trials",
        "quantum",
        "control",
        "thresholdMethod",
        "trialSampling",
        "priors",
      ],
    };
    const models = {
      Entanglement: "ideal-bell",
      Noise: "noisy-bell",
      Illumination: "qubit-illumination",
      Comparison: "qubit-comparison",
    };
    if (
      r.model !== models[r.experimentType] ||
      required[r.experimentType].some(
        (k) => r[k as keyof typeof r] === undefined,
      )
    )
      ctx.addIssue({ code: "custom", message: "Incomplete experiment record" });
  });
export type ExperimentRecord = z.infer<typeof recordSchema>;
export type LiveRun =
  | { type: "Entanglement"; result: LiveEntanglementResult }
  | { type: "Noise"; result: LiveNoiseResult }
  | { type: "Illumination"; result: LiveIlluminationResult }
  | { type: "Comparison"; result: LiveComparisonResult };
export function createRecord(run: LiveRun): ExperimentRecord {
  const r = run.result;
  const base = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    experimentType: run.type,
    engine: r.engine,
    provenance: "LIVE SIMULATION",
    shots: r.shots,
    seed: r.seed,
  };
  switch (run.type) {
    case "Entanglement": {
      const r = run.result;
      return recordSchema.parse({
        ...base,
        model: "ideal-bell",
        state: r.state,
        concurrence: r.concurrence,
        fidelity: r.fidelity,
        quantumZZ: r.zzCorrelation,
        measuredZZ:
          (r.counts["00"] + r.counts["11"] - r.counts["01"] - r.counts["10"]) /
          r.shots,
        bitOrder: r.bitOrder,
      });
    }
    case "Noise": {
      const r = run.result;
      return recordSchema.parse({
        ...base,
        model: "noisy-bell",
        state: r.state,
        noiseModel: r.model,
        noiseStrength: r.strength,
        concurrence: r.finalConcurrence,
        fidelity: r.fidelity,
        quantumZZ: r.quantumZZCorrelation,
        measuredZZ: r.measuredZZCorrelation,
        bitOrder: r.bitOrder,
      });
    }
    default:
      return recordSchema.parse({ ...run.result, ...base });
  }
}
export function decodeHistory(raw: string | null): {
  records: ExperimentRecord[];
  warning: string;
} {
  if (!raw) return { records: [], warning: "" };
  try {
    const data = JSON.parse(raw);
    if (data.version !== HISTORY_VERSION || !Array.isArray(data.records))
      throw new Error();
    const records = data.records
      .map((r: unknown) => recordSchema.safeParse(r))
      .filter((r: { success: boolean }) => r.success)
      .map((r: { data: ExperimentRecord }) => r.data) as ExperimentRecord[];
    const unique = Array.from(new Map(records.map((r) => [r.id, r])).values());
    return {
      records: unique
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
        .slice(0, HISTORY_LIMIT),
      warning:
        records.length !== data.records.length
          ? "Some invalid saved records were skipped."
          : "",
    };
  } catch {
    return {
      records: [],
      warning:
        "Saved history is invalid or uses an unsupported version. New runs will start a fresh history.",
    };
  }
}
export function encodeHistory(records: ExperimentRecord[]) {
  return JSON.stringify({
    version: HISTORY_VERSION,
    records: records.slice(0, HISTORY_LIMIT),
  });
}
export function filterHistory(
  records: ExperimentRecord[],
  search = "",
  type = "All experiments",
  order = "newest",
) {
  return records
    .filter(
      (r) =>
        (type === "All experiments" || r.experimentType === type) &&
        `${JSON.stringify(r)} ${configuration(r)} Qiskit Aer`
          .toLowerCase()
          .includes(search.trim().toLowerCase()),
    )
    .sort(
      (a, b) =>
        (order === "oldest" ? 1 : -1) * a.timestamp.localeCompare(b.timestamp),
    );
}
export function configuration(r: ExperimentRecord) {
  if (r.state)
    return `${Object.entries(bellStateIds).find(([, id]) => id === r.state)?.[0]}${r.noiseModel ? ` · ${Object.entries(noiseModelIds).find(([, id]) => id === r.noiseModel)?.[0]} ${r.noiseStrength}` : ""}`;
  return `η ${r.reflectivity} · background ${r.backgroundNoise} · channel ${r.channelNoise}${r.targetPresent === undefined ? "" : ` · target ${r.targetPresent ? "present" : "absent"}`}`;
}
export function primaryResult(r: ExperimentRecord) {
  if (r.concurrence !== undefined)
    return `Concurrence ${r.concurrence.toFixed(4)}`;
  if (r.quantum && r.control)
    return `Pe: quantum ${r.quantum.errorProbability.toFixed(4)} / control ${r.control.errorProbability.toFixed(4)}`;
  return `Pd ${r.detectionProbability?.toFixed(4)} · Pfa ${r.falseAlarmProbability?.toFixed(4)} · Pe ${r.errorProbability?.toFixed(4)}`;
}
const csvFields = [
  "id",
  "timestamp",
  "experimentType",
  "state",
  "noiseModel",
  "noiseStrength",
  "reflectivity",
  "backgroundNoise",
  "channelNoise",
  "targetPresent",
  "shots",
  "trials",
  "concurrence",
  "fidelity",
  "quantumZZ",
  "measuredZZ",
  "detectionProbability",
  "falseAlarmProbability",
  "errorProbability",
  "receiverScore",
  "threshold",
  "decision",
  "engine",
  "seed",
  "provenance",
  "model",
  "bitOrder",
  "thresholdMethod",
  "trialSampling",
  "priors",
] as const;
const strategyFields = [
  "detectionProbability",
  "falseAlarmProbability",
  "errorProbability",
  "threshold",
  "auc",
] as const;
export function historyCSV(records: ExperimentRecord[]) {
  const quote = (v: unknown) => `"${String(v ?? "").replaceAll('"', '""')}"`;
  return [
    [
      ...csvFields,
      ...["quantum", "control"].flatMap((s) =>
        strategyFields.map((f) => `${s}.${f}`),
      ),
    ],
    ...records.map((r) => [
      ...csvFields.map((f) => r[f]),
      ...(["quantum", "control"] as const).flatMap((s) =>
        strategyFields.map((f) => r[s]?.[f]),
      ),
    ]),
  ]
    .map((row) => row.map(quote).join(","))
    .join("\r\n");
}
