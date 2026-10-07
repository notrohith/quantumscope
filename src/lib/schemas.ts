import { z } from "zod";
const probability = z.number().min(0).max(1);
const correlation = z.number().min(-1).max(1);
const measurements = z
  .array(z.object({ outcome: z.enum(["00", "01", "10", "11"]), probability }))
  .length(4)
  .refine(
    (rows) =>
      new Set(rows.map((row) => row.outcome)).size === 4 &&
      Math.abs(rows.reduce((sum, row) => sum + row.probability, 0) - 1) < 0.001,
    "Expected four unique outcomes with normalized probabilities",
  );
export const entanglementSchema = z.object({
  concurrence: probability,
  fidelity: probability,
  reducedEntropy: probability,
  zzCorrelation: correlation,
  measurements,
});
export const noiseSchema = z.object({
  initialConcurrence: probability,
  finalConcurrence: probability,
  fidelity: probability,
  quantumZZCorrelation: correlation,
  measuredZZCorrelation: correlation,
  reducedEntropy: probability,
  measurements,
  trend: z
    .array(
      z.object({ noise: z.number().min(0).max(0.5), concurrence: probability }),
    )
    .min(1),
});
export const illuminationSchema = z.object({
  correlationScore: correlation,
  detectionProbability: probability,
  falseAlarmProbability: probability,
  errorProbability: probability,
  detected: z.boolean(),
});
const strategy = z.object({
  detectionProbability: probability,
  falseAlarmProbability: probability,
  errorProbability: probability,
});
const points = z
  .array(
    z.object({ x: probability, quantum: probability, control: probability }),
  )
  .min(1);
export const comparisonSchema = z.object({
  quantum: strategy,
  control: strategy,
  roc: points,
  noise: points,
});

export const liveEntanglementSchema = entanglementSchema
  .extend({
    state: z.enum(["phi_plus", "phi_minus", "psi_plus", "psi_minus"]),
    shots: z
      .number()
      .int()
      .refine((value) => [512, 1024, 2048, 4096, 8192].includes(value)),
    seed: z.number().int().min(0).max(4294967295),
    counts: z.object({
      "00": z.number().int().nonnegative(),
      "01": z.number().int().nonnegative(),
      "10": z.number().int().nonnegative(),
      "11": z.number().int().nonnegative(),
    }),
    engine: z.literal("qiskit-aer"),
    bitOrder: z.literal("q0q1"),
  })
  .refine(
    (result) =>
      Object.values(result.counts).reduce((sum, count) => sum + count, 0) ===
        result.shots &&
      result.measurements.every(
        (row) =>
          Math.abs(
            row.probability - result.counts[row.outcome] / result.shots,
          ) < 1e-10,
      ),
    "Counts and probabilities must agree with shots",
  );
export const healthSchema = z.object({
  status: z.literal("ok"),
  service: z.literal("quantumscope-backend"),
  simulation_engine: z.literal("qiskit-aer"),
});

export const liveNoiseSchema = noiseSchema
  .extend({
    ...liveEntanglementSchema.shape,
    model: z.enum([
      "depolarizing",
      "amplitude_damping",
      "phase_damping",
      "readout_error",
    ]),
    strength: z.number().min(0).max(0.5),
    trend: z
      .array(
        z.object({
          noise: z.number().min(0).max(0.5),
          concurrence: probability,
          fidelity: probability,
          reducedEntropy: probability,
          quantumZZCorrelation: correlation,
          measuredZZCorrelation: correlation,
        }),
      )
      .length(11)
      .refine(
        (points) =>
          points.every((point, i) => Math.abs(point.noise - i / 20) < 1e-10),
        "Expected 11 evenly spaced sweep points",
      ),
  })
  .omit({ concurrence: true, zzCorrelation: true })
  .refine(
    (result) =>
      Object.values(result.counts).reduce((sum, count) => sum + count, 0) ===
        result.shots &&
      result.measurements.every(
        (row) =>
          Math.abs(
            row.probability - result.counts[row.outcome] / result.shots,
          ) < 1e-10,
      ) &&
      Math.abs(
        result.measuredZZCorrelation -
          (result.counts["00"] +
            result.counts["11"] -
            result.counts["01"] -
            result.counts["10"]) /
            result.shots,
      ) < 1e-10,
    "Counts, probabilities and measured correlation must agree",
  );

export const liveIlluminationSchema = z
  .object({
    targetPresent: z.boolean(),
    reflectivity: probability,
    backgroundNoise: probability,
    channelNoise: z.number().min(0).max(0.5),
    shots: liveEntanglementSchema.shape.shots,
    seed: liveEntanglementSchema.shape.seed,
    counts: liveEntanglementSchema.shape.counts,
    measurements,
    trials: z
      .number()
      .int()
      .refine((v) => [100, 200, 500].includes(v)),
    receiverScore: probability,
    threshold: probability,
    decision: z.enum(["target", "no_target"]),
    detectionProbability: probability,
    falseAlarmProbability: probability,
    missProbability: probability,
    errorProbability: probability,
    meanH0Score: probability,
    meanH1Score: probability,
    exactH0Score: probability,
    exactH1Score: probability,
    detectionCount: z.number().int().nonnegative(),
    falseAlarmCount: z.number().int().nonnegative(),
    engine: z.literal("qiskit-aer"),
    model: z.literal("qubit-illumination"),
    bitOrder: z.literal("q0q1"),
    thresholdMethod: z.literal("exact-model-midpoint"),
    trialSampling: z.literal("exact-probability-binomial"),
  })
  .refine((r) => {
    const near = (a: number, b: number) => Math.abs(a - b) < 1e-10;
    return (
      Object.values(r.counts).reduce((a, b) => a + b, 0) === r.shots &&
      r.measurements.every((row) =>
        near(row.probability, r.counts[row.outcome] / r.shots),
      ) &&
      near(r.receiverScore, r.counts["00"] / r.shots) &&
      r.decision === (r.receiverScore > r.threshold ? "target" : "no_target") &&
      r.detectionCount <= r.trials &&
      r.falseAlarmCount <= r.trials &&
      near(r.detectionProbability, r.detectionCount / r.trials) &&
      near(r.falseAlarmProbability, r.falseAlarmCount / r.trials) &&
      near(r.missProbability, 1 - r.detectionProbability) &&
      near(
        r.errorProbability,
        (r.falseAlarmProbability + r.missProbability) / 2,
      ) &&
      near(r.threshold, (r.exactH0Score + r.exactH1Score) / 2)
    );
  }, "Inconsistent illumination measurements or trial statistics");

const detectionMetricsSchema = strategy.extend({
  missProbability: probability,
  detectionCount: z.number().int().nonnegative(),
  falseAlarmCount: z.number().int().nonnegative(),
  threshold: probability,
  meanH0Score: probability,
  meanH1Score: probability,
  exactH0Score: probability,
  exactH1Score: probability,
});
const comparisonTrials = z
  .number()
  .int()
  .refine((v) => [200, 500, 1000].includes(v));
const rocSchema = z
  .array(
    z.object({
      falseAlarmProbability: probability,
      detectionProbability: probability,
    }),
  )
  .min(2)
  .refine(
    (points) =>
      points[0].falseAlarmProbability === 0 &&
      points[0].detectionProbability === 0 &&
      points.at(-1)?.falseAlarmProbability === 1 &&
      points.at(-1)?.detectionProbability === 1 &&
      points.every(
        (p, i) =>
          i === 0 ||
          (p.falseAlarmProbability >= points[i - 1].falseAlarmProbability &&
            p.detectionProbability >= points[i - 1].detectionProbability),
      ),
    "ROC endpoints and ordering must be valid",
  );
const liveStrategySchema = detectionMetricsSchema
  .extend({
    shots: liveEntanglementSchema.shape.shots,
    trials: comparisonTrials,
    roc: rocSchema,
    auc: probability,
  })
  .refine(
    (s) =>
      Math.abs(
        s.auc -
          s.roc
            .slice(1)
            .reduce(
              (area, p, i) =>
                area +
                ((p.falseAlarmProbability - s.roc[i].falseAlarmProbability) *
                  (p.detectionProbability + s.roc[i].detectionProbability)) /
                  2,
              0,
            ),
      ) < 1e-9,
    "AUC must agree with ROC points",
  );
export const liveComparisonSchema = z
  .object({
    reflectivity: probability,
    backgroundNoise: probability,
    channelNoise: z.number().min(0).max(0.5),
    shots: liveEntanglementSchema.shape.shots,
    trials: comparisonTrials,
    seed: liveEntanglementSchema.shape.seed,
    quantum: liveStrategySchema,
    control: liveStrategySchema,
    sweep: z
      .array(
        z.object({
          backgroundNoise: probability,
          quantum: detectionMetricsSchema,
          control: detectionMetricsSchema,
        }),
      )
      .length(9),
    engine: z.literal("qiskit-aer"),
    model: z.literal("qubit-comparison"),
    priors: z.literal("equal"),
    thresholdMethod: z.literal("exact-model-midpoint"),
    trialSampling: z.literal("exact-probability-binomial"),
  })
  .refine((r) => {
    const near = (a: number, b: number) => Math.abs(a - b) < 1e-10;
    const metrics = [
      r.quantum,
      r.control,
      ...r.sweep.flatMap((p) => [p.quantum, p.control]),
    ];
    return (
      [r.quantum, r.control].every(
        (s) => s.shots === r.shots && s.trials === r.trials,
      ) &&
      r.sweep.every((p, i) => near(p.backgroundNoise, i / 10)) &&
      metrics.every(
        (s) =>
          s.detectionCount <= r.trials &&
          s.falseAlarmCount <= r.trials &&
          near(s.detectionProbability, s.detectionCount / r.trials) &&
          near(s.falseAlarmProbability, s.falseAlarmCount / r.trials) &&
          near(s.missProbability, 1 - s.detectionProbability) &&
          near(
            s.errorProbability,
            (s.falseAlarmProbability + s.missProbability) / 2,
          ) &&
          near(s.threshold, (s.exactH0Score + s.exactH1Score) / 2),
      )
    );
  }, "Inconsistent comparison resources, rates, thresholds or sweep");
