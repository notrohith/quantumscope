"use client";
import { useBackendStatus } from "./platform-provider";
import { Cpu } from "lucide-react";

export function BackendStatus() {
  const status = useBackendStatus();
  return (
    <div className="engine-card">
      <div>
        <Cpu size={17} />
        <strong>Simulation Engine</strong>
      </div>
      <p>
        Qiskit Aer <span>SIMULATOR</span>
      </p>
      <small
        title="Updated on app load and simulation requests. Use Check connection to recheck."
        role="status"
      >
        <span
          className={status === "connected" ? "connected-dot" : "offline-dot"}
        />
        Backend:{" "}
        {status === "checking"
          ? "Checking…"
          : status === "connected"
            ? "Connected"
            : "Not connected"}
      </small>
      <button
        className="connection-check"
        disabled={status === "checking"}
        onClick={() =>
          window.dispatchEvent(new Event("quantumscope:check-backend"))
        }
      >
        Check connection
      </button>
    </div>
  );
}
