"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";
import { checkBackendHealth } from "@/lib/api";
import { historyStore } from "@/lib/history-store";
import { HISTORY_KEY } from "@/lib/experiment-history";
const BackendContext = createContext<"checking" | "connected" | "disconnected">(
  "checking",
);
export const useBackendStatus = () => useContext(BackendContext);
export const useHistory = () =>
  useSyncExternalStore(
    historyStore.subscribe,
    historyStore.getSnapshot,
    historyStore.getServerSnapshot,
  );
export function PlatformProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<
    "checking" | "connected" | "disconnected"
  >("checking");
  useEffect(() => {
    historyStore.refresh();
    const sync = (event: StorageEvent) => {
      if (event.key === HISTORY_KEY || event.key === null)
        historyStore.refresh();
    };
    window.addEventListener("storage", sync);
    const controller = new AbortController();
    let checking = false;
    const check = () => {
      if (checking) return;
      checking = true;
      setStatus("checking");
      checkBackendHealth(controller.signal).then((connected) => {
        checking = false;
        if (!controller.signal.aborted)
          setStatus(connected ? "connected" : "disconnected");
      });
    };
    const connection = (event: Event) =>
      setStatus(
        (event as CustomEvent<boolean>).detail ? "connected" : "disconnected",
      );
    const offline = () => setStatus("disconnected");
    window.addEventListener("quantumscope:backend-status", connection);
    window.addEventListener("quantumscope:check-backend", check);
    window.addEventListener("online", check);
    window.addEventListener("offline", offline);
    check();
    return () => {
      window.removeEventListener("storage", sync);
      controller.abort();
      window.removeEventListener("quantumscope:backend-status", connection);
      window.removeEventListener("quantumscope:check-backend", check);
      window.removeEventListener("online", check);
      window.removeEventListener("offline", offline);
    };
  }, []);
  return (
    <BackendContext.Provider value={status}>{children}</BackendContext.Provider>
  );
}
export function HistoryNotice() {
  const { warning } = useHistory();
  return warning ? (
    <p className="history-warning" role="status">
      {warning}
    </p>
  ) : null;
}
