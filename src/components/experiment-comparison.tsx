"use client";
import { demoPresets } from "@/lib/presets";
import { explanations } from "@/lib/scientific-copy";
import { InfoTooltip } from "./ui/tooltip";
import { useState } from "react";
import { Atom, GitCompareArrows, LoaderCircle } from "lucide-react";
import { shotOptions } from "@/lib/mock-data";
import { runComparisonSimulation } from "@/lib/api";
import { useSimulation } from "@/lib/use-simulation";
import type { ComparisonResult, LiveComparisonResult } from "@/lib/types";
import {
  DemoDataBadge,
  EmptyResults,
  Note,
  ResultCard,
  ParameterSlider,
  SelectField,
} from "./shared";
import {
  ROCCurve,
  StrategyChart,
  ComparisonROCChart,
  ComparisonErrorChart,
} from "./charts";
import { Button } from "./ui/button";

export function ExperimentComparison() {
  const [reflectivity, setReflectivity] = useState(0.1);
  const [backgroundNoise, setBackgroundNoise] = useState(0.25);
  const [channelNoise, setChannelNoise] = useState(0.1);
  const [shots, setShots] = useState(2048);
  const [trials, setTrials] = useState(500);
  const sim = useSimulation<ComparisonResult | LiveComparisonResult>();
  const result = sim.response?.result;
  const live = result && "engine" in result ? result : null;
  const demo = sim.response?.source === "demo";
  const parameters = {
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
  const difference = live
    ? live.quantum.errorProbability - live.control.errorProbability
    : 0;
  const interpretation = !live
    ? "Illustrative comparison fixtures."
    : Math.abs(difference) < 1e-12
      ? "Under the selected parameters, both strategies produced the same estimated error probability."
      : difference < 0
        ? "Under the selected parameters, the quantum-correlated strategy produced a lower estimated error probability."
        : "The unentangled control produced a lower estimated error probability for this configuration.";
  const provenance = live ? (
    <span className="api-badge">Live Qiskit simulation</span>
  ) : undefined;
  return (
    <>
      <section className="panel comparison-settings">
        <div className="panel-heading">
          <div>
            <h2>Shared experiment settings</h2>
            <p>
              One transmitted signal and one retained reference per shot, for
              each strategy.
            </p>
          </div>
        </div>
        <button
          type="button"
          className="preset-button"
          onClick={() => {
            const p = demoPresets.comparison;
            setReflectivity(p.reflectivity);
            setBackgroundNoise(p.backgroundNoise);
            setChannelNoise(p.channelNoise);
            setShots(p.shots);
            setTrials(p.trials);
          }}
        >
          Same Conditions Comparison
        </button>
        <p className="preset-hint">
          Preset fills controls only. Click Run to calculate.
        </p>
        <div className="comparison-controls">
          <ParameterSlider
            label="Reflectivity"
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
            options={shotOptions}
            onChange={(v) => setShots(Number(v))}
          />
          <SelectField
            label="Trials per hypothesis"
            value={trials}
            options={[200, 500, 1000]}
            onChange={(v) => setTrials(Number(v))}
          />
          <Button
            disabled={sim.loading}
            aria-busy={sim.loading}
            className="run-button"
            onClick={() =>
              sim.run(
                () => runComparisonSimulation(parameters),
                `η ${reflectivity.toFixed(2)} · background ${backgroundNoise.toFixed(2)} · channel ${channelNoise.toFixed(2)} · ${shots} shots · ${trials} trials per hypothesis and strategy`,
              )
            }
          >
            {sim.loading ? (
              <LoaderCircle size={16} className="spin" />
            ) : (
              <GitCompareArrows size={16} />
            )}{" "}
            {sim.loading ? "Comparing strategies…" : "Run Comparison"}
          </Button>
        </div>
        <p className="parameter-note">
          Identical channels, shots, trials, and equal priors. Independent
          seeded observations. Seed 42.{" "}
        </p>
        {sim.error && (
          <p className="error-message" role="alert">
            {sim.error}
          </p>
        )}
        <p role="status" className="run-status">
          {sim.status}
        </p>
      </section>
      {result ? (
        <>
          <div className="noise-result-context" role="status">
            <strong>
              {sim.error || sim.loading || changed
                ? "Previous successful result"
                : demo
                  ? "Illustrative fixture"
                  : "Completed comparison"}
            </strong>
            {live && (
              <span>
                η {live.reflectivity.toFixed(2)} · background{" "}
                {live.backgroundNoise.toFixed(2)} · channel{" "}
                {live.channelNoise.toFixed(2)} · {live.shots} shots ·{" "}
                {live.trials} trials per hypothesis and strategy · seed{" "}
                {live.seed}
              </span>
            )}
            {changed && (
              <small>
                Controls have changed. Run again to update these results.
              </small>
            )}
          </div>
          <div className="comparison-grid">
            {(["quantum", "control"] as const).map((key) => {
              const data = result[key];
              const details = live?.[key];
              const Icon = key === "quantum" ? Atom : GitCompareArrows;
              return (
                <section className={`panel strategy-card ${key}`} key={key}>
                  <div className="strategy-heading">
                    <span className="strategy-icon">
                      <Icon size={23} />
                    </span>
                    {demo ? <DemoDataBadge /> : provenance}
                  </div>
                  <h2>
                    {key === "quantum"
                      ? "Quantum-Correlated Strategy"
                      : "Unentangled Control Strategy"}
                  </h2>
                  <p>
                    {key === "quantum"
                      ? "Bell Φ+ signal–idler preparation. Inverse Bell receiver; score is the 00 fraction."
                      : "Independent |+⟩ signal and I/2 reference. X-basis signal receiver; score is the + fraction."}
                  </p>
                  <dl>
                    <div>
                      <dt>
                        Estimated Detection Probability{" "}
                        <InfoTooltip text={explanations.pd} />
                      </dt>
                      <dd>{data.detectionProbability.toFixed(3)}</dd>
                    </div>
                    <div>
                      <dt>
                        Estimated False Alarm Probability{" "}
                        <InfoTooltip text={explanations.pfa} />
                      </dt>
                      <dd>{data.falseAlarmProbability.toFixed(3)}</dd>
                    </div>
                    <div>
                      <dt>
                        Estimated Error Probability{" "}
                        <InfoTooltip text={explanations.pe} />
                      </dt>
                      <dd>{data.errorProbability.toFixed(4)}</dd>
                    </div>
                    {details && (
                      <>
                        <div>
                          <dt>Estimated Miss Probability</dt>
                          <dd>{details.missProbability.toFixed(3)}</dd>
                        </div>
                        <div>
                          <dt>Mean H0 Score</dt>
                          <dd>{details.meanH0Score.toFixed(4)}</dd>
                        </div>
                        <div>
                          <dt>Mean H1 Score</dt>
                          <dd>{details.meanH1Score.toFixed(4)}</dd>
                        </div>
                        <div>
                          <dt>Calibrated Threshold</dt>
                          <dd>{details.threshold.toFixed(4)}</dd>
                        </div>
                        <div>
                          <dt>
                            ROC AUC · empirical{" "}
                            <InfoTooltip text={explanations.auc} />
                          </dt>
                          <dd>{details.auc.toFixed(3)}</dd>
                        </div>
                      </>
                    )}
                  </dl>
                  {details && (
                    <p className="chart-note">
                      {details.detectionCount}/{details.trials} detections ·{" "}
                      {details.falseAlarmCount}/{details.trials} false alarms.
                      Threshold is the exact-model midpoint; score &gt;
                      threshold declares target.
                    </p>
                  )}
                </section>
              );
            })}
          </div>
          <Note>
            <strong>Interpretation</strong>
            <p>
              {interpretation}{" "}
              {live &&
                "This comparison of finite-trial estimates is not a significance test or evidence of universal quantum advantage."}
            </p>
          </Note>
          <div className="comparison-grid">
            <ResultCard
              title="Receiver Operating Characteristic"
              description="Estimated detection vs false alarm probability"
              demo={demo}
              provenance={provenance}
            >
              {live ? (
                <ComparisonROCChart
                  quantum={live.quantum.roc}
                  control={live.control.roc}
                />
              ) : (
                "roc" in result && <ROCCurve data={result.roc} />
              )}
              <p className="chart-note">
                ROC <InfoTooltip text={explanations.roc} /> ·{" "}
                {live
                  ? "Each curve sweeps all observed score thresholds for that strategy. Ties move together. Dashed diagonal is a random-reference line; AUC is descriptive."
                  : "Illustrative demo ROC."}
              </p>
            </ResultCard>
            <ResultCard
              title={
                live
                  ? "Error Probability vs Background Noise"
                  : "Illustrative Detection vs Noise"
              }
              description={
                live
                  ? `Reflectivity ${live.reflectivity.toFixed(2)} and channel noise ${live.channelNoise.toFixed(2)} held fixed`
                  : "Authored demo data"
              }
              demo={demo}
              provenance={provenance}
            >
              {live ? (
                <ComparisonErrorChart data={live.sweep} />
              ) : (
                "noise" in result && (
                  <StrategyChart data={result.noise} xLabel="Noise strength" />
                )
              )}
              <p className="chart-note">
                {live
                  ? "Nine background strengths, 0.0–0.8. Each point uses fresh equal-size trial ensembles and the same midpoint calibration rule. Lines connect sampled estimates; small fluctuations are expected."
                  : "Not calculated from the selected parameters."}
              </p>
            </ResultCard>
          </div>
        </>
      ) : (
        <EmptyResults loading={sim.loading} error={sim.error} />
      )}
      <Note>
        <strong>Resource matching and scope</strong>
        <p>
          Both signal preparations have 50% excited-state population and use one
          signal plus one retained qubit. The control carries local coherence,
          with an independent reference that contains no target information.
          Receiver architectures differ and neither benchmark is claimed
          globally optimal. Probabilities and ROC curves are Monte Carlo
          estimates from exact Aer receiver probabilities; no confidence
          intervals are shown. This simplified qubit model establishes no
          optical or universal quantum advantage.
        </p>
      </Note>
    </>
  );
}
