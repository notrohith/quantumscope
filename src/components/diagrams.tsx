import type { BellState } from "@/lib/types";
import { bellPreparation, explanations } from "@/lib/scientific-copy";
import { InfoTooltip } from "./ui/tooltip";
import {
  Atom,
  Split,
  Waves,
  ScanLine,
  ChartNoAxesCombined,
  ChevronRight,
} from "lucide-react";
export function ExperimentPipeline() {
  const steps = [
    { title: "Bell Pair", sub: "Preparation", icon: Atom },
    { title: "Signal / Idler", sub: "Split", icon: Split },
    { title: "Noisy Target", sub: "Channel", icon: Waves },
    { title: "Joint", sub: "Measurement", icon: ScanLine },
    { title: "Detection", sub: "Analysis", icon: ChartNoAxesCombined },
  ];
  return (
    <div className="pipeline">
      {steps.map(({ title, sub, icon: Icon }, i) => (
        <div className="pipeline-group" key={title}>
          <div className="pipeline-step">
            <div className="pipeline-top">
              <span className="step-number">0{i + 1}</span>
              <Icon size={22} />
            </div>
            <strong>{title}</strong>
            <span>{sub}</span>
          </div>
          {i < 4 && <ChevronRight className="pipeline-arrow" size={17} />}
        </div>
      ))}
    </div>
  );
}
export function QuantumCircuitDiagram({
  state = "Bell Φ+",
}: {
  state?: BellState;
}) {
  const gates = bellPreparation[state];
  const sequence = `H(q0) → CX(q0,q1)${gates.x ? " → X(q1)" : ""}${gates.z ? " → Z(q0)" : ""} → Measurement`;
  return (
    <div className="circuit-wrap">
      <svg
        viewBox="0 0 580 155"
        role="img"
        aria-label={`Conceptual preparation circuit for ${state}: ${sequence}`}
      >
        <g fill="#c0cadb" fontSize="16" fontFamily="monospace">
          <text x="10" y="53">
            q₀ |0⟩
          </text>
          <text x="10" y="117">
            q₁ |0⟩
          </text>
        </g>
        <g stroke="#718099" strokeWidth="1.5">
          <path d="M100 48H555M100 112H555" />
        </g>
        <g stroke="#b0a4ff" strokeWidth="2">
          <path d="M240 48V112" />
          <circle cx="240" cy="48" r="5" fill="#b0a4ff" />
          <circle cx="240" cy="112" r="14" fill="#191d2b" />
          <path d="M230 112H250M240 102V122" />
        </g>
        {[
          { gate: "H", x: 155, y: 48 },
          ...(gates.x ? [{ gate: "X", x: 320, y: 112 }] : []),
          ...(gates.z ? [{ gate: "Z", x: 400, y: 48 }] : []),
          { gate: "M", x: 510, y: 48 },
          { gate: "M", x: 510, y: 112 },
        ].map(({ gate, x, y }) => (
          <g key={`${gate}-${y}`}>
            <rect
              x={x - 19}
              y={y - 19}
              width="38"
              height="38"
              rx="5"
              fill={gate === "M" ? "#1d2d35" : "#292640"}
              stroke={gate === "M" ? "#7bc7d2" : "#b0a4ff"}
            />
            <text
              x={x}
              y={y + 6}
              textAnchor="middle"
              fill="#e0dcff"
              fontSize="18"
            >
              {gate}
            </text>
          </g>
        ))}
      </svg>
      <p className="caption">
        {state} · {sequence}
      </p>
    </div>
  );
}
export function NoisePipeline({ readout }: { readout: boolean }) {
  const steps = readout
    ? ["Bell Pair", "Ideal quantum state", "Measurement", "Readout Error"]
    : ["Bell Pair", "Local Noise Channels", "Noisy State", "Measurement"];
  return (
    <>
      <ol
        className="noise-pipeline"
        aria-label={
          readout
            ? "Classical readout error sequence"
            : "Local quantum noise sequence"
        }
      >
        {steps.map((step, i) => (
          <li key={step}>
            <span className="step-number">0{i + 1}</span>
            <strong>{step}</strong>
            {i < steps.length - 1 && <ChevronRight aria-hidden="true" />}
          </li>
        ))}
      </ol>
      <p className="chart-note">
        {readout
          ? "Recorded bits can flip after measurement. The pre-measurement quantum state and its entanglement are unchanged."
          : "The selected local channel acts independently on both qubits before measurement."}
      </p>
    </>
  );
}
export function IlluminationDiagram() {
  return (
    <div className="illumination-diagram">
      <div
        className="illumination-flow"
        role="img"
        aria-label="Bell source splits into signal and idler paths. Signal passes target, background and channel noise, then returns. The ideal stored idler and return enter a joint Bell receiver, followed by a target decision."
      >
        <div className="flow-source">
          <strong>Bell Φ+ source</strong>
          <span>Signal q0 + idler q1</span>
        </div>
        <div className="flow-lanes">
          <section>
            <h3>Signal path · q0</h3>
            <ol>
              <li>
                <strong>Target</strong>
                <span>H1: loss · H0: independent reset</span>
              </li>
              <li>
                <strong>Noise</strong>
                <span>Background → Channel</span>
              </li>
              <li>
                <strong>Return</strong>
                <span>To the joint receiver</span>
              </li>
            </ol>
          </section>
          <section className="idler-lane">
            <h3>Idler path · q1</h3>
            <div>
              <strong>Ideal stored idler</strong>
              <span>No storage noise</span>
              <span>Retained for joint measurement</span>
            </div>
          </section>
        </div>
        <div className="flow-receiver">
          <strong>Joint Bell receiver</strong>
          <span>Return + idler · CX(q0,q1) → H(q0)</span>
          <span>Bell-match score = n00 / shots</span>
        </div>
        <div className="flow-decision">
          <strong>Decision</strong>
          <span>Score &gt; threshold → H1; otherwise H0</span>
        </div>
      </div>
      <div className="illumination-help">
        <span>
          Reflectivity η <InfoTooltip text={explanations.reflectivity} />
        </span>
        <span>
          Background noise <InfoTooltip text={explanations.background} />
        </span>
        <span>
          Channel noise <InfoTooltip text={explanations.channel} />
        </span>
      </div>
    </div>
  );
}
