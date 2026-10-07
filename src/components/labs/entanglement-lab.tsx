"use client";
import { demoPresets } from "@/lib/presets";
import { useState } from "react";
import { runEntanglementSimulation } from "@/lib/api";
import { bellStates, shotOptions } from "@/lib/mock-data";
import { useSimulation } from "@/lib/use-simulation";
import type {
  BellState,
  EntanglementResult,
  LiveEntanglementResult,
} from "@/lib/types";
import {
  EmptyResults,
  MetricCard,
  Note,
  ResultCard,
  SelectField,
  SimulationPanel,
} from "../shared";
import { MeasurementChart } from "../charts";
import { QuantumCircuitDiagram } from "../diagrams";
export function EntanglementLab() {
  const [state, setState] = useState<BellState>("Bell Φ+");
  const [shots, setShots] = useState(2048);
  const [loadedState, setLoadedState] = useState<BellState>("Bell Φ+");
  const sim = useSimulation<EntanglementResult | LiveEntanglementResult>();
  const result = sim.response?.result;
  const live = result && "engine" in result ? result : null;
  const demo = sim.response?.source === "demo";
  return (
    <>
      <div className="lab-layout">
        <SimulationPanel
          {...sim}
          demo={false}
          buttonLabel="Run Simulation"
          loadingLabel="Running Qiskit simulation…"
          onRun={() =>
            sim.run(async () => {
              const response = await runEntanglementSimulation({
                state,
                shots,
              });
              setLoadedState(state);
              return response;
            }, `${state} · ${shots} shots`)
          }
        >
          <button
            type="button"
            className="preset-button"
            onClick={() => {
              const p = demoPresets.entanglement;
              setState(p.state);
              setShots(p.shots);
            }}
          >
            Ideal Bell Pair
          </button>
          <p className="preset-hint">
            Preset fills controls only. Click Run to calculate.
          </p>
          <SelectField
            label="Quantum state"
            value={state}
            options={bellStates}
            onChange={(v) => setState(v as BellState)}
          />
          <SelectField
            label="Shots"
            value={shots}
            options={shotOptions}
            onChange={(v) => setShots(Number(v))}
          />
          <div className="parameter-note">
            Two qubits. One correlated system.
            <br />
            Exact state metrics and finite-shot Aer measurements. Ideal Bell
            states only.
          </div>
        </SimulationPanel>
        <div className="results-stack">
          {result ? (
            <>
              <div className="noise-result-context" role="status">
                <strong>
                  {demo
                    ? "Illustrative fixture"
                    : sim.error ||
                        sim.loading ||
                        loadedState !== state ||
                        live?.shots !== shots
                      ? "Previous successful result"
                      : "Completed experiment"}
                </strong>
                <span>
                  {loadedState}
                  {live && ` · ${live.shots} shots · seed ${live.seed}`}
                </span>
                {(loadedState !== state || (live && live.shots !== shots)) && (
                  <small>
                    Controls have changed. Run again to update these results.
                  </small>
                )}
              </div>
              <div className="metrics-grid">
                <MetricCard
                  label="Concurrence"
                  value={result.concurrence}
                  demo={demo}
                  liveLabel="Qiskit Aer"
                  detail="Two-qubit entanglement, from 0 to 1."
                />
                <MetricCard
                  label="Fidelity"
                  value={result.fidelity}
                  demo={demo}
                  liveLabel="Qiskit Aer"
                  detail="Similarity to the ideal target state."
                />
                <MetricCard
                  label="Reduced Entropy"
                  value={result.reducedEntropy}
                  demo={demo}
                  liveLabel="Qiskit Aer"
                  detail="Entanglement entropy for a pure bipartite state, in bits."
                />
                <MetricCard
                  label="ZZ Correlation"
                  value={result.zzCorrelation}
                  demo={demo}
                  liveLabel="Qiskit Aer"
                  detail="Computational-basis correlation, from −1 to +1."
                />
              </div>
              <ResultCard
                title="Measurement Distribution"
                description={`Loaded state: ${loadedState} · Computational basis${live ? ` · ${live.shots.toLocaleString()} shots` : ""}`}
                demo={demo}
                provenance={
                  live && <span className="api-badge">Qiskit Aer</span>
                }
              >
                <MeasurementChart data={result.measurements} />
                {live && (
                  <div
                    className="shot-counts"
                    aria-label="Aer measurement counts"
                  >
                    {(["00", "01", "10", "11"] as const).map((outcome) => (
                      <span key={outcome}>
                        <strong>{outcome}</strong>{" "}
                        {live.counts[outcome].toLocaleString()}
                      </span>
                    ))}
                  </div>
                )}
                {live && (
                  <p className="chart-note">
                    Exact metrics are calculated from the ideal quantum state,
                    not estimated from counts. Bars show Aer counts /{" "}
                    {live.shots.toLocaleString()} shots. Bit labels are q₀q₁
                    (left bit = q₀). Seed: {live.seed}.
                  </p>
                )}
                <p className="chart-note">
                  {loadedState.includes("Φ")
                    ? `An ideal ${loadedState} state produces strongly correlated 00 and 11 measurement outcomes.`
                    : `An ideal ${loadedState} state produces anticorrelated 01 and 10 measurement outcomes.`}{" "}
                  The relative phase is not visible in this basis.
                </p>
              </ResultCard>
            </>
          ) : (
            <EmptyResults loading={sim.loading} error={sim.error} />
          )}
          <ResultCard
            title="Conceptual preparation circuit"
            description={`Selected configuration: ${state} · Preview updates independently of completed results`}
          >
            <QuantumCircuitDiagram state={state} />
          </ResultCard>
        </div>
      </div>
      <Note>
        <strong>Why these metrics matter</strong>
        <p>
          Concurrence measures two-qubit entanglement. Fidelity measures
          similarity to the ideal target state. Reduced entropy indicates
          entanglement for an ideal pure bipartite state. ZZ correlation
          measures measurement correlation in the computational basis; by
          itself, it does not establish entanglement.
        </p>
      </Note>
    </>
  );
}
