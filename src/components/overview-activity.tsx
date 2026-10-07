"use client";
import Link from "next/link";
import { useBackendStatus, useHistory } from "./platform-provider";
import { configuration, primaryResult } from "@/lib/experiment-history";
const modules = [
  {
    title: "Entanglement",
    href: "/entanglement",
    demo: false,
    description: "Prepare a Bell pair and inspect its correlations.",
  },
  {
    title: "Noise",
    href: "/noise",
    demo: false,
    description: "See how a noisy channel changes that state.",
  },
  {
    title: "Illumination",
    href: "/illumination",
    demo: false,
    description: "Test target detection in the qubit model.",
  },
  {
    title: "Comparison",
    href: "/comparison",
    demo: false,
    description: "Compare quantum and unentangled control receivers.",
  },
];
export function OverviewActivity() {
  const { records, ready, warning } = useHistory();
  const status = useBackendStatus();
  const last = records[0];
  return (
    <>
      <div className="metrics-grid overview-metrics history-overview">
        <article className="metric-card">
          <div className="metric-label">
            {warning ? "Runs in this visit" : "Total Saved Runs"}
          </div>
          <div className="metric-value">{ready ? records.length : "—"}</div>
          <p>Latest 100 · This browser only</p>
        </article>
        <article className="metric-card">
          <div className="metric-label">Last Simulation</div>
          <strong>
            {last?.experimentType ?? (ready ? "No runs yet" : "Loading…")}
          </strong>
          <p>
            {last
              ? new Date(last.timestamp).toLocaleString()
              : "Run a lab to begin"}
          </p>
        </article>
        <article className="metric-card">
          <div className="metric-label">Live Modules</div>
          <div className="metric-value">
            {modules.filter((m) => !m.demo).length}
            <span className="metric-symbol">/ 4</span>
          </div>
          <p>Configured for Qiskit Aer</p>
        </article>
        <article className="metric-card">
          <div className="metric-label">Backend Status</div>
          <strong>
            {status === "connected"
              ? "Connected"
              : status === "checking"
                ? "Checking…"
                : "Not connected"}
          </strong>
          <p>Health checked on load and requests · Recheck in sidebar</p>
        </article>
      </div>
      <section className="panel presentation-sequence">
        <div className="panel-heading">
          <div>
            <h2>Recommended demo sequence</h2>
            <p>
              Run each lab, then open Results to review and export your
              presentation.
            </p>
          </div>
          <Link href="/results">View Results →</Link>
        </div>
        <ol>
          {modules.map((m) => (
            <li key={m.href}>
              <Link href={m.href}>
                <strong>{m.title}</strong>
                <span className={m.demo ? "demo-badge" : "api-badge"}>
                  {m.demo ? "Demo Data" : "LIVE SIMULATION"}
                </span>
                <p>{m.description}</p>
              </Link>
            </li>
          ))}
        </ol>
      </section>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Recent Activity</h2>
            <p>
              Results from individual experiments; different metrics are not
              directly comparable.
            </p>
          </div>
          <Link href="/results">All runs →</Link>
        </div>
        {records.length ? (
          <div className="recent-results">
            {records.slice(0, 4).map((r) => (
              <article key={r.id}>
                <div className="section-heading">
                  <h3>{r.experimentType}</h3>
                  <span className="api-badge">LIVE SIMULATION</span>
                </div>
                <time dateTime={r.timestamp}>
                  {new Date(r.timestamp).toLocaleString()}
                </time>
                <p>{configuration(r)}</p>
                <strong>{primaryResult(r)}</strong>
                <small>
                  Qiskit Aer · {r.model} · {r.shots.toLocaleString()} shots ·
                  seed {r.seed}
                </small>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <h3>
              {ready
                ? "No recorded simulations yet"
                : "Loading recent activity…"}
            </h3>
            <p>
              Follow the sequence above. Each successful live run is recorded
              automatically.
            </p>
          </div>
        )}
      </section>
    </>
  );
}
