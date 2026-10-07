export type BellState = "Bell Φ+" | "Bell Φ−" | "Bell Ψ+" | "Bell Ψ−";
export type BellStateId = "phi_plus" | "phi_minus" | "psi_plus" | "psi_minus";
export type BasisOutcome = "00" | "01" | "10" | "11";
export type NoiseModel =
  "Depolarizing" | "Amplitude Damping" | "Phase Damping" | "Readout Error";
export interface EntanglementParameters {
  state: BellState;
  shots: number;
}
export type NoiseModelId =
  "depolarizing" | "amplitude_damping" | "phase_damping" | "readout_error";
export interface NoiseParameters {
  state?: BellState;
  seed?: number;
  model: NoiseModel;
  strength: number;
  shots: number;
}
export interface IlluminationParameters {
  trials?: number;
  seed?: number;
  targetPresent: boolean;
  reflectivity: number;
  backgroundNoise: number;
  channelNoise: number;
  shots: number;
}
export interface Measurement {
  outcome: string;
  probability: number;
}
export interface EntanglementResult {
  concurrence: number;
  fidelity: number;
  reducedEntropy: number;
  zzCorrelation: number;
  measurements: Measurement[];
}
/** Metadata exists only on validated responses from the real endpoint. */
export interface LiveEntanglementResult extends EntanglementResult {
  state: BellStateId;
  shots: number;
  seed: number;
  counts: Record<BasisOutcome, number>;
  engine: "qiskit-aer";
  bitOrder: "q0q1";
}
export interface NoisePoint {
  noise: number;
  concurrence: number;
}
export interface NoiseSimulationResult {
  initialConcurrence: number;
  finalConcurrence: number;
  fidelity: number;
  quantumZZCorrelation: number;
  measuredZZCorrelation: number;
  reducedEntropy: number;
  measurements: Measurement[];
  trend: NoisePoint[];
}
export interface NoiseSweepPoint extends NoisePoint {
  fidelity: number;
  reducedEntropy: number;
  quantumZZCorrelation: number;
  /** Exact expected recorded correlation, not finite-shot data. */
  measuredZZCorrelation: number;
}
export interface LiveNoiseResult extends NoiseSimulationResult {
  state: BellStateId;
  model: NoiseModelId;
  strength: number;
  shots: number;
  seed: number;
  counts: Record<BasisOutcome, number>;
  trend: NoiseSweepPoint[];
  engine: "qiskit-aer";
  bitOrder: "q0q1";
}
export interface IlluminationResult {
  correlationScore: number;
  detectionProbability: number;
  falseAlarmProbability: number;
  errorProbability: number;
  detected: boolean;
}
export interface StrategyResult {
  detectionProbability: number;
  falseAlarmProbability: number;
  errorProbability: number;
}
export interface ComparisonPoint {
  x: number;
  quantum: number;
  control: number;
}
export interface ComparisonResult {
  quantum: StrategyResult;
  control: StrategyResult;
  roc: ComparisonPoint[];
  noise: ComparisonPoint[];
}
export interface ExperimentResult {
  id: string;
  experiment: "Entanglement" | "Noise" | "Illumination";
  state: BellState;
  noiseModel: NoiseModel | "None";
  noiseStrength: number;
  reflectivity: number | null;
  shots: number;
  concurrence: number | null;
  detectionProbability: number | null;
  errorProbability: number | null;
}
export interface SimulationResponse<T> {
  source: "demo" | "api";
  result: T;
}

export interface LiveIlluminationResult extends IlluminationParameters {
  trials: number;
  seed: number;
  receiverScore: number;
  threshold: number;
  decision: "target" | "no_target";
  detectionProbability: number;
  falseAlarmProbability: number;
  missProbability: number;
  errorProbability: number;
  meanH0Score: number;
  meanH1Score: number;
  exactH0Score: number;
  exactH1Score: number;
  detectionCount: number;
  falseAlarmCount: number;
  counts: Record<BasisOutcome, number>;
  measurements: Measurement[];
  engine: "qiskit-aer";
  model: "qubit-illumination";
  bitOrder: "q0q1";
  thresholdMethod: "exact-model-midpoint";
  trialSampling: "exact-probability-binomial";
}

export interface ComparisonParameters {
  reflectivity: number;
  backgroundNoise: number;
  channelNoise: number;
  shots: number;
  trials: number;
  seed?: number;
}
export interface DetectionMetrics extends StrategyResult {
  missProbability: number;
  detectionCount: number;
  falseAlarmCount: number;
  threshold: number;
  meanH0Score: number;
  meanH1Score: number;
  exactH0Score: number;
  exactH1Score: number;
}
export interface ROCPoint {
  falseAlarmProbability: number;
  detectionProbability: number;
}
export interface LiveComparisonStrategy extends DetectionMetrics {
  shots: number;
  trials: number;
  roc: ROCPoint[];
  auc: number;
}
export interface ComparisonSweepPoint {
  backgroundNoise: number;
  quantum: DetectionMetrics;
  control: DetectionMetrics;
}
export interface LiveComparisonResult extends ComparisonParameters {
  seed: number;
  quantum: LiveComparisonStrategy;
  control: LiveComparisonStrategy;
  sweep: ComparisonSweepPoint[];
  engine: "qiskit-aer";
  model: "qubit-comparison";
  priors: "equal";
  thresholdMethod: "exact-model-midpoint";
  trialSampling: "exact-probability-binomial";
}
