import type {
  BellState,
  EntanglementResult,
  NoiseSimulationResult,
  IlluminationResult,
  ComparisonResult,
  ExperimentResult,
} from "./types";
export const bellStates: BellState[] = [
  "Bell Φ+",
  "Bell Φ−",
  "Bell Ψ+",
  "Bell Ψ−",
];
export const noiseModels = [
  "Depolarizing",
  "Amplitude Damping",
  "Phase Damping",
  "Readout Error",
] as const;
export const shotOptions = [512, 1024, 2048, 4096, 8192];
export const overviewMetrics = [
  {
    label: "Concurrence",
    value: 0.87,
    detail: "Two-qubit entanglement",
    symbol: "C",
  },
  {
    label: "Bell Fidelity",
    value: 0.91,
    detail: "Similarity to the target state",
    symbol: "F",
  },
  {
    label: "Noise Strength",
    value: 0.12,
    detail: "Channel noise parameter",
    symbol: "γ",
  },
  {
    label: "Detection Probability",
    value: 0.84,
    detail: "Target detection under H₁",
    symbol: "Pᴅ",
  },
];
const correlated = [
  { outcome: "00", probability: 0.5 },
  { outcome: "01", probability: 0 },
  { outcome: "10", probability: 0 },
  { outcome: "11", probability: 0.5 },
];
const anticorrelated = [
  { outcome: "00", probability: 0 },
  { outcome: "01", probability: 0.5 },
  { outcome: "10", probability: 0.5 },
  { outcome: "11", probability: 0 },
];
// Authored fixtures, not a quantum model or stochastic simulation.
export function getEntanglementMock(state: BellState): EntanglementResult {
  const psi = state.includes("Ψ");
  return {
    concurrence: 1,
    fidelity: 1,
    reducedEntropy: 1,
    zzCorrelation: psi ? -1 : 1,
    measurements: psi ? anticorrelated : correlated,
  };
}
export const noiseTrend = [
  { noise: 0, concurrence: 1 },
  { noise: 0.05, concurrence: 0.92 },
  { noise: 0.1, concurrence: 0.83 },
  { noise: 0.15, concurrence: 0.73 },
  { noise: 0.2, concurrence: 0.62 },
  { noise: 0.25, concurrence: 0.5 },
  { noise: 0.3, concurrence: 0.38 },
  { noise: 0.35, concurrence: 0.25 },
  { noise: 0.4, concurrence: 0.14 },
  { noise: 0.45, concurrence: 0.06 },
  { noise: 0.5, concurrence: 0 },
];
export const noiseMock: NoiseSimulationResult = {
  initialConcurrence: 1,
  finalConcurrence: 0.83,
  fidelity: 0.89,
  quantumZZCorrelation: 0.8,
  measuredZZCorrelation: 0.8,
  reducedEntropy: 1,
  measurements: [
    { outcome: "00", probability: 0.45 },
    { outcome: "01", probability: 0.05 },
    { outcome: "10", probability: 0.05 },
    { outcome: "11", probability: 0.45 },
  ],
  trend: noiseTrend,
};
export const illuminationMock: IlluminationResult = {
  correlationScore: 0.72,
  detectionProbability: 0.84,
  falseAlarmProbability: 0.18,
  errorProbability: 0.17,
  detected: true,
};
export const absentTargetMock: IlluminationResult = {
  correlationScore: 0.13,
  detectionProbability: 0.84,
  falseAlarmProbability: 0.18,
  errorProbability: 0.17,
  detected: false,
};
export const comparisonMock: ComparisonResult = {
  quantum: {
    detectionProbability: 0.86,
    falseAlarmProbability: 0.17,
    errorProbability: 0.155,
  },
  control: {
    detectionProbability: 0.69,
    falseAlarmProbability: 0.25,
    errorProbability: 0.28,
  },
  roc: [
    { x: 0, quantum: 0, control: 0 },
    { x: 0.05, quantum: 0.48, control: 0.2 },
    { x: 0.1, quantum: 0.71, control: 0.38 },
    { x: 0.17, quantum: 0.86, control: 0.54 },
    { x: 0.25, quantum: 0.92, control: 0.69 },
    { x: 0.5, quantum: 0.97, control: 0.86 },
    { x: 0.75, quantum: 0.99, control: 0.94 },
    { x: 1, quantum: 1, control: 1 },
  ],
  noise: [
    { x: 0, quantum: 0.96, control: 0.87 },
    { x: 0.1, quantum: 0.86, control: 0.69 },
    { x: 0.2, quantum: 0.77, control: 0.6 },
    { x: 0.3, quantum: 0.67, control: 0.51 },
    { x: 0.4, quantum: 0.55, control: 0.42 },
    { x: 0.5, quantum: 0.43, control: 0.34 },
  ],
};
export const experimentMocks: ExperimentResult[] = [
  {
    id: "EXP-001",
    experiment: "Entanglement",
    state: "Bell Φ+",
    noiseModel: "None",
    noiseStrength: 0,
    reflectivity: null,
    shots: 2048,
    concurrence: 1,
    detectionProbability: null,
    errorProbability: null,
  },
  {
    id: "EXP-002",
    experiment: "Entanglement",
    state: "Bell Ψ−",
    noiseModel: "None",
    noiseStrength: 0,
    reflectivity: null,
    shots: 4096,
    concurrence: 1,
    detectionProbability: null,
    errorProbability: null,
  },
  {
    id: "EXP-003",
    experiment: "Noise",
    state: "Bell Φ+",
    noiseModel: "Depolarizing",
    noiseStrength: 0.1,
    reflectivity: null,
    shots: 2048,
    concurrence: 0.83,
    detectionProbability: null,
    errorProbability: null,
  },
  {
    id: "EXP-004",
    experiment: "Noise",
    state: "Bell Φ+",
    noiseModel: "Phase Damping",
    noiseStrength: 0.2,
    reflectivity: null,
    shots: 2048,
    concurrence: 0.62,
    detectionProbability: null,
    errorProbability: null,
  },
  {
    id: "EXP-005",
    experiment: "Illumination",
    state: "Bell Φ+",
    noiseModel: "Depolarizing",
    noiseStrength: 0.1,
    reflectivity: 0.1,
    shots: 4096,
    concurrence: null,
    detectionProbability: 0.84,
    errorProbability: 0.17,
  },
  {
    id: "EXP-006",
    experiment: "Illumination",
    state: "Bell Φ+",
    noiseModel: "Amplitude Damping",
    noiseStrength: 0.2,
    reflectivity: 0.15,
    shots: 8192,
    concurrence: null,
    detectionProbability: 0.76,
    errorProbability: 0.23,
  },
];
