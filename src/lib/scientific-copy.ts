import type { BellState } from "./types";
/** Mirrors backend/app/simulation/entanglement.py::prepare_bell_state. */
export const bellPreparation: Record<BellState, { x: boolean; z: boolean }> = {
  "Bell Φ+": { x: false, z: false },
  "Bell Φ−": { x: false, z: true },
  "Bell Ψ+": { x: true, z: false },
  "Bell Ψ−": { x: true, z: true },
};
export const explanations = {
  reflectivity:
    "Signal survival parameter η. Under H1, amplitude damping has decay probability 1 − η; this is a qubit loss model, not literal optical reflectivity.",
  background:
    "Simplified background-noise model: depolarizing mixing toward I/2 on the returned signal. It does not represent a full thermal optical bath.",
  channel:
    "Additional depolarizing noise on signal q0 after the background channel. The stored idler/reference remains ideal.",
  pd: "Estimated detection probability: the fraction of H1 trials declared target present. Finite trial counts introduce sampling uncertainty.",
  pfa: "Estimated false alarm probability: the fraction of H0 trials declared target present.",
  pe: "Estimated error probability with equal H0/H1 priors: ½(Pfa + 1 − Pd). Zero observed errors does not prove zero true error probability.",
  roc: "Detection rate versus false alarm rate as the threshold sweeps observed scores. Tied scores move together; the curve uses finite trial ensembles.",
  auc: "Trapezoidal area under the empirical ROC curve. This describes ranking performance for these samples, not proof of universal quantum advantage.",
};
export const projectScope =
  "This application is an educational/research simulation platform using a discrete-variable qubit model. It does not reproduce a complete optical bosonic quantum illumination experiment.";
