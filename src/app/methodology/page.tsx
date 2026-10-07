import { Atom, Code2, Cpu } from "lucide-react";
import { PageHeader, ResultCard, Note } from "@/components/shared";
import { QuantumCircuitDiagram } from "@/components/diagrams";
export const metadata = { title: "Methodology" };
const metrics = [
  [
    "Concurrence",
    "Measures two-qubit entanglement on a scale from 0 (separable) to 1 (maximally entangled).",
  ],
  [
    "State Fidelity",
    "Measures similarity between the prepared state and a chosen ideal target state.",
  ],
  [
    "Reduced Von Neumann Entropy",
    "For a pure bipartite state, the entropy of either reduced state quantifies entanglement. For mixed states, reduced entropy alone is not an entanglement measure.",
  ],
  [
    "ZZ Correlation",
    "The expectation of Z ⊗ Z measures computational-basis correlation. Positive values favor equal outcomes; negative values favor unequal outcomes. It is not, by itself, proof of entanglement.",
  ],
];
const noise = [
  [
    "Depolarizing noise",
    "Aer depolarizing_error(p, 1): E(ρ) = (1 − p)ρ + p I/2. The total nonidentity Pauli probability is 3p/4.",
  ],
  [
    "Amplitude damping",
    "Aer amplitude_damping_error(γ), with equilibrium excited-state population zero: |1⟩ decays toward |0⟩ with probability γ. Φ and Ψ states need not respond identically.",
  ],
  [
    "Phase damping",
    "Aer phase_damping_error(p) preserves populations and scales each single-qubit off-diagonal by √(1 − p). It is not a phase-flip probability.",
  ],
  [
    "Readout error",
    "Aer ReadoutError independently flips each recorded bit with probability p. The pre-measurement density matrix, concurrence, fidelity, entropy, and quantum ZZ remain unchanged.",
  ],
];
export default function Page() {
  return (
    <>
      <PageHeader
        eyebrow="REFERENCE / SCIENTIFIC FOUNDATION"
        title="Methodology"
        description="The concepts, assumptions, and boundaries behind QuantumScope."
      />
      <div className="methodology-grid">
        <ResultCard
          title="Bell-State Preparation"
          description="01 / Creating a shared quantum state"
        >
          <div className="formula">
            <Atom size={26} />
            <span>|Φ⁺⟩ = (|00⟩ + |11⟩) / √2</span>
          </div>
          <p>
            Starting from |00⟩, a Hadamard gate on the first qubit creates a
            superposition. A CNOT controlled by that qubit then prepares the
            Bell Φ+ state. The backend then applies X(q1) for Ψ+ and Ψ−,
            followed by Z(q0) for Φ− and Ψ−. Exact metrics use the unmeasured
            statevector; a separate measured copy runs finite shots in Qiskit
            Aer.
          </p>
          <QuantumCircuitDiagram />
        </ResultCard>
        <ResultCard
          title="Entanglement Metrics"
          description="02 / Describing a two-qubit state"
        >
          <dl className="explanation-list">
            {metrics.map(([title, text]) => (
              <div key={title}>
                <dt>{title}</dt>
                <dd>{text}</dd>
              </div>
            ))}
          </dl>
        </ResultCard>
        <ResultCard
          title="Noise Models"
          description="03 / Live Qiskit Noise Lab"
        >
          <p>
            After ideal Bell preparation, the same local quantum channel acts
            independently on q0 and q1, once on each qubit, before measurement.
            Readout error instead acts only on the recorded measurement bits.
          </p>
          <dl className="explanation-list">
            {noise.map(([title, text]) => (
              <div key={title}>
                <dt>{title}</dt>
                <dd>{text}</dd>
              </div>
            ))}
          </dl>
        </ResultCard>
        <ResultCard
          title="Exact States & Sampled Measurements"
          description="Live Noise Lab / Two complementary views"
        >
          <dl className="explanation-list">
            <div>
              <dt>Exact density-matrix calculations</dt>
              <dd>
                Concurrence, matching Bell fidelity, reduced subsystem entropy
                in bits, and quantum ZZ are calculated from the noisy density
                matrix. For mixed states, local entropy is not a standalone
                entanglement measure; concurrence is the principal metric here.
              </dd>
            </div>
            <div>
              <dt>Finite-shot Aer measurements</dt>
              <dd>
                The histogram and measured ZZ = (n00 + n11 − n01 − n10) / shots
                use actual recorded counts. They include sampling variation and
                any readout flips. Labels are q0q1, with q0 on the left.
              </dd>
            </div>
            <div>
              <dt>Exact strength sweep</dt>
              <dd>
                Eleven points from 0.00 to 0.50 in steps of 0.05 use exact state
                calculations. The readout curve uses exact classical transition
                probabilities, while the selected run’s measured ZZ card uses
                shots. Readout concurrence remains flat.
              </dd>
            </div>
          </dl>
        </ResultCard>
        <ResultCard
          title="Target Detection"
          description="04 / Live qubit illumination-inspired model"
        >
          <div className="hypotheses">
            <span>
              <strong>H₀</strong> target absent
            </span>
            <span>
              <strong>H₁</strong> target present
            </span>
          </div>
          <dl className="explanation-list">
            <div>
              <dt>Detection probability · Pᴅ</dt>
              <dd>Probability of declaring a target when one is present.</dd>
            </div>
            <div>
              <dt>False alarm probability · Pꜰᴀ</dt>
              <dd>Probability of declaring a target when none is present.</dd>
            </div>
            <div>
              <dt>Miss probability · 1 − Pᴅ</dt>
              <dd>Probability of failing to detect a present target.</dd>
            </div>
            <div>
              <dt>Error probability · Pₑ</dt>
              <dd>
                With equal hypothesis priors, Pₑ = ½(Pꜰᴀ + 1 − Pᴅ). The live
                detection experiment and live comparison use this convention.
              </dd>
            </div>
            <div>
              <dt>ROC curve</dt>
              <dd>
                Detection probability plotted against false alarm probability as
                a decision threshold changes.
              </dd>
            </div>
          </dl>
        </ResultCard>
      </div>
      <ResultCard
        title="Signal–Idler Target Model"
        description="Exact channels and a calibrated Bell receiver"
      >
        <dl className="explanation-list">
          <div>
            <dt>Transmitter and hypotheses</dt>
            <dd>
              Prepare Bell Φ+ with q0 as signal and q1 as an ideal stored idler.
              H1 sends only the signal through target loss, background
              contamination, and propagation noise. H0 replaces the original
              signal independently with |0⟩ before the same environmental
              channels; the joint state is the product of this return and the
              reduced idler I/2. No original signal–idler correlation survives
              H0.
            </dd>
          </div>
          <div>
            <dt>Reflectivity η: signal survival</dt>
            <dd>
              H1 uses amplitude damping with decay probability γ = 1 − η. At η =
              1 the target channel preserves the signal; at η = 0 it resets the
              signal to |0⟩, so H1 equals H0. This is qubit relaxation, not a
              photon-erasure flag or literal optical reflectivity.
            </dd>
          </div>
          <div>
            <dt>Background b and propagation c</dt>
            <dd>
              Apply D_b then D_c to signal q0 only, where D_p(ρ) = (1 − p)ρ + p
              I/2. Background ranges from 0 to 1; propagation decoherence ranges
              from 0 to 0.5. These have different modeled roles but the same
              channel family, with combined visibility (1 − b)(1 − c). They
              cannot be separately inferred from this receiver. The idler has no
              storage noise.
            </dd>
          </div>
          <div>
            <dt>Bell-match receiver</dt>
            <dd>
              Apply CX(q0,q1), then H(q0), then measure. Outcome 00 is the Φ+
              match. One observation’s score is n00 / shots; it is not a
              posterior detection confidence.
            </dd>
          </div>
          <div>
            <dt>Threshold and repeated trials</dt>
            <dd>
              The threshold is the midpoint of exact H0 and H1 match
              probabilities, calculated before evaluation samples. Score greater
              than threshold declares H1; equality declares H0. This
              model-calibrated rule is not claimed optimal. For each hypothesis,
              generate the selected number of independent observations, each
              representing the selected shot count. Empirical Pd and Pfa count
              declarations across H1 and H0 trials, respectively; Pm = 1 − Pd
              and Pe = ½(Pfa + Pm).
            </dd>
          </div>
          <div>
            <dt>Exact probabilities, sampled observations</dt>
            <dd>
              Qiskit density matrices produce both exact receiver probabilities.
              Independent seeded binomial draws generate statistically
              equivalent repeated fixed-circuit Bell-match counts without
              redundant transpilation. A separate selected H0 or H1 observation
              is measured by Aer. The target toggle changes that observation
              only; both trial ensembles always run. Finite-trial rates have
              sampling uncertainty, including when no errors are observed.
            </dd>
          </div>
        </dl>
      </ResultCard>
      <ResultCard
        title="Quantum-Correlated vs Unentangled Control"
        description="Equal resources, specified receivers, empirical comparisons"
      >
        <dl className="explanation-list">
          <div>
            <dt>Control transmitter and matched resources</dt>
            <dd>
              The control prepares a |+⟩ signal and an independent I/2
              reference. Both signal preparations have 50% excited-state
              population; both strategies use one transmitted signal and one
              retained qubit per shot. Shots, trials per hypothesis,
              reflectivity, background, propagation noise, and equal priors are
              identical. Local coherence differs intentionally; this does not
              match preparation complexity or prove an optimal classical
              benchmark.
            </dd>
          </div>
          <div>
            <dt>Appropriate receivers</dt>
            <dd>
              The quantum-correlated strategy retains the inverse Bell receiver.
              The control measures signal X using H(q0) before measurement,
              scoring the + outcome regardless of the reference bit. H0 has no X
              coherence; H1 can retain it. The independent reference carries no
              hypothesis information. Receiver architectures differ and are not
              claimed globally optimal.
            </dd>
          </div>
          <div>
            <dt>Calibration and sampling</dt>
            <dd>
              Each strategy uses its own exact-model midpoint threshold, with
              the same strict score &gt; threshold decision rule. The shared
              target code applies the same signal-only channels. One Aer
              density-matrix batch supplies exact receiver probabilities.
              Independent seeded binomial ensembles use the same sampling policy
              and sample sizes; no threshold or seed is chosen to force an
              advantage.
            </dd>
          </div>
          <div>
            <dt>ROC and AUC</dt>
            <dd>
              For each strategy, sweep every distinct observed H0/H1 score
              threshold. Tied scores move together; endpoints include (0,0) and
              (1,1). False alarm and detection rates come from those same
              empirical score distributions. AUC uses trapezoidal integration of
              the ordered ROC points and is descriptive, not a primary advantage
              claim.
            </dd>
          </div>
          <div>
            <dt>Background sweep and uncertainty</dt>
            <dd>
              Nine strengths from 0.0 to 0.8 keep reflectivity, propagation
              noise, shots, and trials fixed. Each point uses fresh ensembles
              and the same midpoint calibration rule. Small nonmonotonic
              fluctuations are possible. Pd, Pfa, Pm, and Pe are Monte Carlo
              estimates; no confidence intervals or significance claim are
              provided. Equal or lower control error is displayed without
              modification.
            </dd>
          </div>
        </dl>
      </ResultCard>
      <ResultCard
        title="Local History & Reproducibility"
        description="Browser-local records · No database"
      >
        <p>
          Successful validated live runs from all four labs are stored in this
          browser, with configuration, scalar metrics, seed, engine, model, and
          ISO UTC timestamp. History retains the latest 100 runs. Local-time
          display and filtered CSV export are available in Results; full ROC and
          sweep arrays are not retained.
        </p>
        <p>
          Demo fixtures and failed requests are never stored. Clearing browser
          storage removes history. Identical settings and seeds reproduce the
          configured sampling process; finite-trial estimates remain subject to
          sampling uncertainty. The engine is a simulator, not quantum hardware.
        </p>
      </ResultCard>
      <Note>
        <strong>Quantum Illumination Scope</strong>
        <p>
          This is a discrete-variable qubit model inspired by quantum
          illumination and does not reproduce the full bosonic optical
          quantum-illumination protocol. No canonical 6 dB advantage or
          radar-equivalent physical performance is claimed. The live comparison
          evaluates a specified unentangled control, not an optimal classical
          detector.
        </p>
      </Note>
      <section>
        <div className="section-heading">
          <h2>Technology</h2>
        </div>
        <div className="comparison-grid">
          <ResultCard title="Frontend">
            <div className="technology">
              <Code2 />
              <p>Next.js · TypeScript · Tailwind CSS · shadcn/ui · Recharts</p>
            </div>
          </ResultCard>
          <ResultCard title="Simulation Backend">
            <div className="technology">
              <Cpu />
              <div>
                <p>Python · FastAPI · Qiskit · Qiskit Aer</p>
                <span className="planned-badge">
                  Live: Entanglement · Noise · Illumination · Comparison
                </span>
              </div>
            </div>
          </ResultCard>
        </div>
      </section>
      <p className="reference-links">
        Further reading:{" "}
        <a
          href="https://quantum.cloud.ibm.com/learning/en/courses/basics-of-quantum-information/entanglement-in-action/introduction"
          target="_blank"
          rel="noreferrer"
        >
          IBM Quantum: Entanglement in action
        </a>{" "}
        ·{" "}
        <a
          href="https://quantum.cloud.ibm.com/learning/en/courses/tools-for-quantum-advantage/noise-and-errors"
          target="_blank"
          rel="noreferrer"
        >
          Noise and errors
        </a>
      </p>
    </>
  );
}
