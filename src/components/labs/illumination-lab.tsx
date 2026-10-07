"use client";
import { demoPresets } from "@/lib/presets";
import { useState } from "react";
import { Radar } from "lucide-react";
import { runIlluminationSimulation } from "@/lib/api";
import { shotOptions } from "@/lib/mock-data";
import { useSimulation } from "@/lib/use-simulation";
import type { IlluminationResult, LiveIlluminationResult } from "@/lib/types";
import {
  DemoDataBadge,
  EmptyResults,
  MetricCard,
  Note,
  ParameterSlider,
  ResultCard,
  SelectField,
  SimulationPanel,
} from "../shared";
import { IlluminationDiagram } from "../diagrams";
import { MeasurementChart, ReceiverScoreChart } from "../charts";

export function IlluminationLab() {
  const [targetPresent, setTargetPresent] = useState(true);
  const [reflectivity, setReflectivity] = useState(0.1);
  const [backgroundNoise, setBackgroundNoise] = useState(0.25);
  const [channelNoise, setChannelNoise] = useState(0.1);
  const [shots, setShots] = useState(2048);
  const [trials, setTrials] = useState(200);
  const sim = useSimulation<IlluminationResult | LiveIlluminationResult>();
  const result = sim.response?.result;
  const live = result && "engine" in result ? result : null;
  const demo = sim.response?.source === "demo";
  const parameters = {
    targetPresent,
    reflectivity,
    backgroundNoise,
    channelNoise,
    shots,
    trials,
  };
  const changed =
    live &&
    Object.entries(parameters).some(
      ([key, value]) => live[key as keyof typeof parameters] !== value,
    );
  const score =
    live?.receiverScore ??
    (result && "correlationScore" in result ? result.correlationScore : 0);
  const decision = live
    ? live.decision === "target"
    : result && "detected" in result
      ? result.detected
      : false;
  const provenance = live ? (
    <span className="api-badge">Qiskit Aer</span>
  ) : undefined;
  return (
    <>
      <ResultCard
        title="The signal–idler experiment"
        description="Bell Φ+ source · q0 signal · q1 ideal stored idler"
      >
        <IlluminationDiagram />
      </ResultCard>
      <div className="lab-layout">
        <SimulationPanel
          {...sim}
          demo={false}
          buttonLabel="Run Detection Experiment"
          loadingLabel="Running target-detection trials…"
          liveDescription="One Aer observation plus independent H0 and H1 trial ensembles. Seed 42."
          onRun={() =>
            sim.run(
              () => runIlluminationSimulation(parameters),
              `${targetPresent ? "H1" : "H0"} observation · η ${reflectivity.toFixed(2)} · background ${backgroundNoise.toFixed(2)} · channel ${channelNoise.toFixed(2)} · ${shots} shots × ${trials} trials per hypothesis`,
            )
          }
        >
          <button
            type="button"
            className="preset-button"
            onClick={() => {
              const p = demoPresets.illumination;
              setTargetPresent(p.targetPresent);
              setReflectivity(p.reflectivity);
              setBackgroundNoise(p.backgroundNoise);
              setChannelNoise(p.channelNoise);
              setShots(p.shots);
              setTrials(p.trials);
            }}
          >
            Weak Target / Moderate Noise
          </button>
          <p className="preset-hint">
            Preset fills controls only. Click Run to calculate.
          </p>
          <div className="toggle-field">
            <label htmlFor="target-present">Target Present</label>
            <input
              id="target-present"
              type="checkbox"
              role="switch"
              checked={targetPresent}
              onChange={(e) => setTargetPresent(e.target.checked)}
            />
          </div>
          <ParameterSlider
            label="Target Reflectivity"
            value={reflectivity}
            onChange={setReflectivity}
          />
          <ParameterSlider
            label="Background Noise"
            value={backgroundNoise}
            onChange={setBackgroundNoise}
          />
          <ParameterSlider
            label="Channel Noise"
            value={channelNoise}
            onChange={setChannelNoise}
            max={0.5}
          />
          <SelectField
            label="Shots per observation"
            value={shots}
            onChange={(v) => setShots(Number(v))}
            options={shotOptions}
          />
          <SelectField
            label="Detection Trials"
            value={trials}
            onChange={(v) => setTrials(Number(v))}
            options={[100, 200, 500]}
          />
          <p className="parameter-note">
            The toggle selects the single displayed observation. Detection
            metrics always use both H0 and H1, with {trials} trials each.
          </p>
        </SimulationPanel>
        <div className="results-stack">
          {result ? (
            <>
              <div className="noise-result-context" role="status">
                <strong>
                  {sim.error || sim.loading || changed
                    ? "Previous successful result"
                    : demo
                      ? "Illustrative fixture"
                      : "Completed detection experiment"}
                </strong>
                {live && (
                  <span>
                    {live.targetPresent
                      ? "H1 / target present"
                      : "H0 / target absent"}{" "}
                    observation · η {live.reflectivity.toFixed(2)} · background{" "}
                    {live.backgroundNoise.toFixed(2)} · channel{" "}
                    {live.channelNoise.toFixed(2)} · {live.shots} shots ·{" "}
                    {live.trials} trials per hypothesis · seed {live.seed}
                  </span>
                )}
                {changed && (
                  <small>
                    Controls have changed. Run again to update these results.
                  </small>
                )}
              </div>
              <div className="metrics-grid two-metrics">
                <MetricCard
                  label="Bell-Match Score"
                  value={score}
                  precision={4}
                  demo={demo}
                  liveLabel="Aer · single observation"
                  detail="Fraction of receiver measurements equal to 00 after CX(q0,q1), then H(q0). This is not posterior confidence."
                />
                <MetricCard
                  label="Estimated Detection Probability"
                  value={result.detectionProbability}
                  precision={3}
                  demo={demo}
                  liveLabel="H1 trials · empirical"
                  detail="Fraction of target-present observations whose score exceeds the threshold."
                />
                <MetricCard
                  label="Estimated False Alarm Probability"
                  value={result.falseAlarmProbability}
                  precision={3}
                  demo={demo}
                  liveLabel="H0 trials · empirical"
                  detail="Fraction of target-absent observations whose score exceeds the threshold."
                />
                <MetricCard
                  label="Estimated Error Probability"
                  value={result.errorProbability}
                  precision={3}
                  demo={demo}
                  liveLabel="Equal priors · empirical"
                  detail="Pe = ½(Pfa + Pm), with miss probability Pm = 1 − Pd."
                />
              </div>
              <section className="detection-panel">
                <div className="detection-icon">
                  <Radar size={30} />
                </div>
                <span className="eyebrow">Single-observation decision</span>
                <h2>{decision ? "TARGET DETECTED" : "NO TARGET DETECTED"}</h2>
                <p>
                  {live
                    ? `Score ${score.toFixed(4)} ${decision ? ">" : "≤"} threshold ${live.threshold.toFixed(4)}. Ground truth: ${live.targetPresent ? "target present" : "target absent"}.`
                    : "Illustrative fixture decision."}
                </p>
                {demo ? <DemoDataBadge /> : provenance}
              </section>
              {live && (
                <>
                  <ResultCard
                    title="Receiver Scores & Threshold"
                    description="Empirical ensemble means · deterministic model calibration"
                    provenance={provenance}
                  >
                    <ReceiverScoreChart
                      meanH0={live.meanH0Score}
                      meanH1={live.meanH1Score}
                      threshold={live.threshold}
                    />
                    <div className="receiver-summary">
                      <span>
                        Mean H0 <strong>{live.meanH0Score.toFixed(4)}</strong>
                      </span>
                      <span>
                        Mean H1 <strong>{live.meanH1Score.toFixed(4)}</strong>
                      </span>
                      <span>
                        Threshold <strong>{live.threshold.toFixed(4)}</strong>
                      </span>
                    </div>
                    <p className="chart-note">
                      Threshold = midpoint of exact model scores (
                      {live.exactH0Score.toFixed(4)},{" "}
                      {live.exactH1Score.toFixed(4)}), chosen before evaluation
                      trials. It is a calibration rule, not an optimal receiver
                      or a fitted posterior.
                    </p>
                  </ResultCard>
                  <ResultCard
                    title="Repeated Detection Trials"
                    description={`${live.trials} H0 + ${live.trials} H1 observations · ${live.shots} shots per observation`}
                    provenance={provenance}
                  >
                    <div className="receiver-summary">
                      <span>
                        Detections{" "}
                        <strong>
                          {live.detectionCount} / {live.trials}
                        </strong>
                      </span>
                      <span>
                        False alarms{" "}
                        <strong>
                          {live.falseAlarmCount} / {live.trials}
                        </strong>
                      </span>
                      <span>
                        Miss probability{" "}
                        <strong>{live.missProbability.toFixed(3)}</strong>
                      </span>
                    </div>
                    <p className="chart-note">
                      Trial scores use independent seeded binomial draws from
                      exact Qiskit receiver probabilities, equivalent to
                      repeating the fixed measurement. These finite-trial
                      estimates have sampling uncertainty; observing zero errors
                      does not establish a zero true error rate.
                    </p>
                  </ResultCard>
                  <ResultCard
                    title="Single-Observation Receiver Outcomes"
                    description="Actual Aer counts after the inverse Bell transform · 00 is the Φ+ match"
                    provenance={provenance}
                  >
                    <MeasurementChart data={live.measurements} />
                    <p className="chart-note">
                      q0q1 counts:{" "}
                      {live.measurements
                        .map(
                          ({ outcome }) =>
                            `${outcome}: ${live.counts[outcome as keyof typeof live.counts]}`,
                        )
                        .join(" · ")}
                    </p>
                  </ResultCard>
                </>
              )}
            </>
          ) : (
            <EmptyResults loading={sim.loading} error={sim.error} />
          )}
        </div>
      </div>
      <Note>
        <strong>Scientific scope</strong>
        <p>
          This is a discrete-variable qubit model inspired by quantum
          illumination and does not reproduce the full bosonic optical
          quantum-illumination protocol. No canonical 6 dB advantage or
          radar-equivalent performance is claimed.
        </p>
      </Note>
    </>
  );
}
