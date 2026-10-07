import type { NoiseModel, NoiseModelId } from "./types";
export const noiseModelIds: Record<NoiseModel, NoiseModelId> = {
  Depolarizing: "depolarizing",
  "Amplitude Damping": "amplitude_damping",
  "Phase Damping": "phase_damping",
  "Readout Error": "readout_error",
};
