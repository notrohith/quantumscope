"use client";
import { useState } from "react";
import Link from "next/link";
import { Download, Search, Trash2, Table2 } from "lucide-react";
import {
  configuration,
  experimentTypes,
  filterHistory,
  historyCSV,
  primaryResult,
} from "@/lib/experiment-history";
import { historyStore } from "@/lib/history-store";
import { useHistory } from "./platform-provider";
import { Button } from "./ui/button";
export function ResultsTable() {
  const { records, ready } = useHistory();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All experiments");
  const [order, setOrder] = useState("newest");
  const [confirm, setConfirm] = useState(false);
  const [message, setMessage] = useState("");
  const shown = filterHistory(records, search, filter, order);
  function exportCSV() {
    const url = URL.createObjectURL(
      new Blob(["\uFEFF" + historyCSV(shown)], {
        type: "text/csv;charset=utf-8;",
      }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "quantumscope-live-results.csv";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage(`CSV prepared for ${shown.length} filtered live experiments.`);
  }
  return (
    <section className="panel table-panel">
      <div className="panel-heading">
        <div>
          <h2>Experiment history</h2>
          <p>Browser-local · Latest 100 runs · Export to keep a copy</p>
        </div>
        <span className="api-badge">LIVE SIMULATION</span>
      </div>
      <div className="table-toolbar">
        <div className="search-field">
          <Search size={16} />
          <input
            aria-label="Search experiments"
            placeholder="Search state, model, seed…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          aria-label="Filter by experiment type"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          {["All experiments", ...experimentTypes].map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
        <select
          aria-label="Sort experiments"
          value={order}
          onChange={(e) => setOrder(e.target.value)}
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </select>
        <div className="table-actions">
          <Button
            variant="ghost"
            disabled={!records.length}
            onClick={() => setConfirm(true)}
          >
            <Trash2 size={15} />
            Clear Results
          </Button>
          <Button
            variant="outline"
            onClick={exportCSV}
            disabled={!shown.length}
          >
            <Download size={15} />
            Export CSV
          </Button>
        </div>
      </div>
      {confirm && (
        <div
          className="history-confirm"
          role="group"
          aria-labelledby="clear-heading"
        >
          <div>
            <h3 id="clear-heading">Clear all {records.length} saved runs?</h3>
            <p>
              This removes this browser’s history, including runs hidden by
              filters. Export first to keep a copy. Lab results and the backend
              are unaffected.
            </p>
          </div>
          <Button variant="outline" onClick={() => setConfirm(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              const cleared = historyStore.clear();
              setConfirm(false);
              setMessage(
                cleared
                  ? "All saved experiment history cleared."
                  : "History could not be cleared.",
              );
            }}
          >
            Confirm Clear
          </Button>
        </div>
      )}
      <div className="table-scroll">
        <table>
          <caption className="sr-only">
            Recorded live simulation results; times shown in browser local time
          </caption>
          <thead>
            <tr>
              {[
                "Time",
                "Experiment",
                "Core configuration",
                "Shots",
                "Primary result",
                "Engine / details",
              ].map((c) => (
                <th key={c}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.id}>
                <td>
                  <time dateTime={r.timestamp} title={r.timestamp}>
                    {new Date(r.timestamp).toLocaleString()}
                  </time>
                </td>
                <td>{r.experimentType}</td>
                <td className="history-config">
                  {configuration(r)}
                  {r.trials !== undefined && (
                    <small>
                      {r.trials} trials / hypothesis
                      {r.experimentType === "Comparison" ? " / strategy" : ""}
                    </small>
                  )}
                </td>
                <td>{r.shots.toLocaleString()}</td>
                <td>{primaryResult(r)}</td>
                <td>
                  <strong>Qiskit Aer</strong>
                  <details className="history-details">
                    <summary>Run details</summary>
                    <p className="api-badge">{r.provenance}</p>
                    <dl>
                      {Object.entries(r).map(([key, value]) => (
                        <div key={key}>
                          <dt>{key}</dt>
                          <dd>
                            {typeof value === "object"
                              ? Object.entries(value)
                                  .map(([k, v]) => `${k}: ${v}`)
                                  .join(" · ")
                              : String(value)}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </details>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!shown.length && (
        <div className="empty-state">
          <Table2 size={28} />
          <h2>
            {!ready
              ? "Loading history…"
              : records.length
                ? "No matching experiments"
                : "Your next run starts the story"}
          </h2>
          <p>
            {records.length
              ? "Try another search or experiment type."
              : "Successful live simulations appear here automatically. Demo fixtures are never saved."}
          </p>
          {ready && !records.length && (
            <Link href="/entanglement">Start an entanglement experiment →</Link>
          )}
        </div>
      )}
      <div className="table-footer">
        <span>
          {shown.length} of {records.length} recorded experiments
        </span>
        <span>Local time · ISO UTC in CSV · No database</span>
      </div>
      <p className="run-status" role="status">
        {message}
      </p>
    </section>
  );
}
