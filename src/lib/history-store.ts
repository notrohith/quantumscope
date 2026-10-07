import {
  createRecord,
  decodeHistory,
  encodeHistory,
  HISTORY_KEY,
  HISTORY_LIMIT,
  type ExperimentRecord,
  type LiveRun,
} from "./experiment-history";
export interface HistorySnapshot {
  records: ExperimentRecord[];
  warning: string;
  ready: boolean;
}
const initial: HistorySnapshot = { records: [], warning: "", ready: false };
// Storage is injected so failure, refresh, and recovery paths can be tested without a browser.
export function createHistoryStore(
  getStorage: () => Pick<Storage, "getItem" | "setItem" | "removeItem">,
) {
  let snapshot = initial;
  const listeners = new Set<() => void>();
  const publish = (next: HistorySnapshot) => {
    snapshot = next;
    listeners.forEach((fn) => fn());
  };
  return {
    subscribe(fn: () => void) {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
    getSnapshot: () => snapshot,
    getServerSnapshot: () => initial,
    refresh() {
      try {
        publish({
          ...decodeHistory(getStorage().getItem(HISTORY_KEY)),
          ready: true,
        });
      } catch {
        publish({
          ...snapshot,
          ready: true,
          warning:
            "Browser storage is unavailable. Runs can only be kept in memory for this visit.",
        });
      }
    },
    append(record: ExperimentRecord) {
      let records = snapshot.records;
      try {
        records = [
          ...decodeHistory(getStorage().getItem(HISTORY_KEY)).records,
          ...records,
        ];
      } catch {
        /* Keep memory records when storage is blocked. */
      }
      records = [
        record,
        ...Array.from(new Map(records.map((r) => [r.id, r])).values()).filter(
          (r) => r.id !== record.id,
        ),
      ].slice(0, HISTORY_LIMIT);
      try {
        getStorage().setItem(HISTORY_KEY, encodeHistory(records));
        publish({ records, ready: true, warning: "" });
      } catch {
        publish({
          records,
          ready: true,
          warning:
            "History could not be saved to browser storage. Export CSV before leaving; these runs may be lost on refresh.",
        });
      }
    },
    clear() {
      try {
        getStorage().removeItem(HISTORY_KEY);
        publish({ records: [], ready: true, warning: "" });
        return true;
      } catch {
        publish({
          ...snapshot,
          warning:
            "Browser storage could not be cleared. Your history has been kept; try again when storage is available.",
        });
        return false;
      }
    },
    warn(message: string) {
      publish({ ...snapshot, warning: message });
    },
  };
}
export const historyStore = createHistoryStore(() => window.localStorage);
export function saveLiveRun(run: LiveRun) {
  // A storage failure must never turn a successful scientific response into a failed run.
  try {
    historyStore.append(createRecord(run));
  } catch {
    historyStore.warn(
      "This simulation succeeded, but its history record could not be created. The lab result remains available.",
    );
  }
}
