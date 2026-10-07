"use client";
import { demoPresets } from "@/lib/presets";
import { useState } from "react";
import { NoisePipeline } from "../diagrams";
import { runNoiseSimulation } from "@/lib/api";
import { bellStateIds } from "@/lib/bell-states";
import { noiseModelIds } from "@/lib/noise-models";
import { bellStates, noiseModels, shotOptions } from "@/lib/mock-data";
import { useSimulation } from "@/lib/use-simulation";
import type {
  BellState,
  LiveNoiseResult,
  NoiseModel,
  NoiseSimulationResult,
} from "@/lib/types";
import {
  EmptyResults,
  MetricCard,
  Note,
  ParameterSlider,
  ResultCard,
  SelectField,
  SimulationPanel,
} from "../shared";
import { MeasurementChart, NoiseSweepChart, NoiseTrendChart } from "../charts";

const readoutExplanation =
  "Readout error affects measured classical outcomes but does not change the underlying pre-measurement quantum state.";
const entropyExplanation =
  "For mixed noisy states, reduced subsystem entropy reflects local mixedness and should not be interpreted alone as an entanglement measure. Concurrence is used here as the principal two-qubit entanglement metric.";

export function NoiseLab() {
  const [state, setState] = useState<BellState>("Bell Φ+");
  const [model, setModel] = useState<NoiseModel>("Depolarizing");
  const [strength, setStrength] = useState(0.1);
  const [shots, setShots] = useState(2048);
  const sim = useSimulation<NoiseSimulationResult | LiveNoiseResult>();
  const result = sim.response?.result;
  const live = result && "engine" in result ? result : null;
  const demo = sim.response?.source === "demo";
  const loadedState = live
    ? bellStates.find((label) => bellStateIds[label] === live.state)
    : "Illustrative Bell fixture";
  const loadedModel = live
    ? noiseModels.find((label) => noiseModelIds[label] === live.model)
    : "Authored noise fixture";
  const readout = live?.model === "readout_error";
  const changed =
    live &&
    (live.state !== bellStateIds[state] ||
      live.model !== noiseModelIds[model] ||
      live.strength !== strength ||
      live.shots !== shots);
  const provenance = live ? (
    <span className="api-badge">Qiskit Aer</span>
  ) : undefined;
  return (
    <>
      <div className="lab-layout">
        <SimulationPanel
          {...sim}
          demo={false}
          buttonLabel="Run Noise Simulation"
          loadingLabel="Evaluating noise sweep…"
          liveDescription="Exact density-matrix sweep and sampled Aer measurements. Seed 42."
          onRun={() =>
            sim.run(
              () => runNoiseSimulation({ state, model, strength, shots }),
              `${state} · ${model} · strength ${strength.toFixed(2)} · ${shots} shots`,
            )
          }
        >
          <button
            type="button"
            className="preset-button"
            onClick={() => {
              const p = demoPresets.noise;
              setState(p.state);
              setModel(p.model);
              setStrength(p.strength);
              setShots(p.shots);
            }}
          >
            Moderate Depolarizing Noise
          </button>
          <p className="preset-hint">
            Preset fills controls only. Click Run to calculate.
          </p>
          <SelectField
            label="Bell state"
            value={state}
            options={bellStates}
            onChange={(v) => setState(v as BellState)}
          />
          <SelectField
            label="Noise model"
            value={model}
            options={noiseModels}
            onChange={(v) => setModel(v as NoiseModel)}
          />
          <ParameterSlider
            label="Noise strength"
            value={strength}
            onChange={setStrength}
            max={0.5}
            step={0.01}
          />
          <SelectField
            label="Shots"
            value={shots}
            options={shotOptions}
            onChange={(v) => setShots(Number(v))}
          />
          <p className="parameter-note">
            {model === "Readout Error"
              ? readoutExplanation
              : "After ideal Bell preparation, the same channel strength acts independently on both qubits."}
          </p>
        </SimulationPanel>
        <div className="results-stack">
          <ResultCard
            title="Noise pathway"
            description={`Selected configuration: ${model} · Conceptual sequence`}
          >
            <NoisePipeline readout={model === "Readout Error"} />
          </ResultCard>
          {result ? (
            <>
              <div className="noise-result-context" role="status">
                <strong>
                  {sim.error || sim.loading || changed
                    ? "Previous successful result"
                    : demo
                      ? "Illustrative fixture"
                      : "Completed experiment"}
                </strong>
                <span>
                  {loadedState} · {loadedModel}
                  {live &&
                    ` · p = ${live.strength.toFixed(2)} · ${live.shots} shots · seed ${live.seed}`}
                </span>
                {changed && (
                  <small>
                    Controls have changed. Run again to update these results.
                  </small>
                )}
              </div>
              <div className="metrics-grid">
                <MetricCard
                  label="Initial Concurrence"
                  value={result.initialConcurrence}
                  demo={demo}
                  liveLabel="Qiskit · exact"
                  detail="Exact entanglement of the ideal Bell density matrix before noise."
                />
                <MetricCard
                  label="Final Concurrence"
                  value={result.finalConcurrence}
                  demo={demo}
                  liveLabel="Qiskit · exact"
                  detail="Exact two-qubit mixed-state entanglement after the channel; 0 to 1."
                />
                <MetricCard
                  label="Bell Fidelity"
                  value={result.fidelity}
                  demo={demo}
                  liveLabel="Qiskit · exact"
                  detail="Exact overlap with the matching ideal Bell target, including its relative phase."
                />
                <MetricCard
                  label="Quantum ZZ Correlation"
                  value={result.quantumZZCorrelation}
                  demo={demo}
                  liveLabel="Qiskit · exact"
                  detail="Pre-measurement expectation Tr(ρ ZZ), from −1 to +1."
                />
              </div>
              <div className="metrics-grid noise-secondary-metrics">
                <MetricCard
                  label="Measured ZZ Correlation"
                  value={result.measuredZZCorrelation}
                  demo={demo}
                  liveLabel="Aer · sampled"
                  detail="(n00 + n11 − n01 − n10) / shots. Includes readout flips and sampling variation."
                />
                <MetricCard
                  label="Reduced Subsystem Entropy"
                  value={result.reducedEntropy}
                  demo={demo}
                  liveLabel="Qiskit · exact · bits"
                  detail={entropyExplanation}
                />
              </div>
              <ResultCard
                title="Concurrence vs Noise Strength"
                description={
                  readout
                    ? "Exact concurrence and expected recorded ZZ correlation"
                    : "11 exact density-matrix calculations · 0.00 to 0.50"
                }
                demo={demo}
                provenance={provenance}
              >
                {live ? (
                  <NoiseSweepChart data={live.trend} readout={readout} />
                ) : (
                  <NoiseTrendChart data={result.trend} />
                )}
                <p className="chart-note">
                  {demo
                    ? "Illustrative demo curve — not calculated by Qiskit."
                    : readout
                      ? "Concurrence stays flat. The second curve is the exact expected measured ZZ after classical flips; the measured metric card above uses finite shots."
                      : "The sweep uses exact state calculations, independent of shots and seed. Lines connect the 11 calculated points."}
                </p>
              </ResultCard>
              <ResultCard
                title="Measurement Distribution"
                description={
                  live
                    ? `${live.shots.toLocaleString()} actual Aer shots · q0q1 basis · left bit is q0`
                    : "Illustrative noisy Bell pair"
                }
                demo={demo}
                provenance={provenance}
              >
                <MeasurementChart data={result.measurements} />
                {live && (
                  <p className="chart-note">
                    Counts:{" "}
                    {live.measurements
                      .map(
                        ({ outcome }) =>
                          `${outcome}: ${live.counts[outcome as keyof typeof live.counts]}`,
                      )
                      .join(" · ")}
                  </p>
                )}
              </ResultCard>
            </>
          ) : (
            <EmptyResults loading={sim.loading} error={sim.error} />
          )}
        </div>
      </div>
      <Note>
        <strong>Interpreting noisy states</strong>
        <p>{entropyExplanation}</p>
      </Note>
    </>
  );
}
