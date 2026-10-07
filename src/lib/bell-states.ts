import type { BellState, BellStateId } from "./types";
/** The UI retains its existing labels; only this API-boundary map uses wire IDs. */
export const bellStateIds: Record<BellState, BellStateId> = {
  "Bell Φ+": "phi_plus",
  "Bell Φ−": "phi_minus",
  "Bell Ψ+": "psi_plus",
  "Bell Ψ−": "psi_minus",
};
