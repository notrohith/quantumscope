/* eslint-disable @typescript-eslint/no-require-imports -- Node CommonJS test harness compiles the existing TypeScript modules without extra dependencies. */
/* Small assertion suite: compile local TS on demand using the existing compiler. */
const fs = require("node:fs");
const ts = require("typescript");
const assert = require("node:assert/strict");
require.extensions[".ts"] = (module, filename) =>
  module._compile(
    ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
      },
    }).outputText,
    filename,
  );
const {
  createRecord,
  decodeHistory,
  encodeHistory,
  filterHistory,
  historyCSV,
  HISTORY_KEY,
} = require("../src/lib/experiment-history.ts");
const {
  createHistoryStore,
  historyStore,
} = require("../src/lib/history-store.ts");
const makeStorage = () => {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
};
const storage = makeStorage();
const store = createHistoryStore(() => storage);
const examples = Object.fromEntries(
  ["noise", "illumination", "comparison"].map((k) => [
    k,
    JSON.parse(fs.readFileSync(`backend/examples/${k}-response.json`, "utf8")),
  ]),
);
const entanglement = {
  state: "phi_plus",
  shots: 1024,
  seed: 42,
  concurrence: 1,
  fidelity: 1,
  reducedEntropy: 1,
  zzCorrelation: 1,
  counts: { "00": 512, "01": 0, 10: 0, 11: 512 },
  measurements: [
    { outcome: "00", probability: 0.5 },
    { outcome: "01", probability: 0 },
    { outcome: "10", probability: 0 },
    { outcome: "11", probability: 0.5 },
  ],
  engine: "qiskit-aer",
  bitOrder: "q0q1",
};
const records = [
  createRecord({ type: "Entanglement", result: entanglement }),
  ...Object.entries(examples).map(([k, result]) =>
    createRecord({ type: k[0].toUpperCase() + k.slice(1), result }),
  ),
];
records.forEach((r, i) => (r.timestamp = `2026-09-30T00:00:0${i}.000Z`));
let updates = 0;
const unsubscribe = store.subscribe(() => updates++);
store.refresh();
records.forEach((r) => store.append(r));
assert.equal(updates, 5);
unsubscribe();
assert.equal(store.getSnapshot().records.length, 4);
const refreshed = createHistoryStore(() => storage);
refreshed.refresh();
assert.deepEqual(refreshed.getSnapshot().records, store.getSnapshot().records);
assert.equal(filterHistory(records, "", "Noise").length, 1);
assert.equal(filterHistory(records, "qubit-comparison").length, 1);
assert.equal(filterHistory(records, "nonsense").length, 0);
assert.equal(
  filterHistory(records, "", "All experiments", "oldest")[0].experimentType,
  "Entanglement",
);
const csv = historyCSV(filterHistory(records, "", "Comparison"));
const rows = csv
  .split("\r\n")
  .map((row) => row.split(",").map((v) => v.slice(1, -1)));
assert.equal(rows.length, 2);
const exported = Object.fromEntries(rows[0].map((h, i) => [h, rows[1][i]]));
assert.equal(
  exported["quantum.errorProbability"],
  String(examples.comparison.quantum.errorProbability),
);
assert.equal(
  exported["control.detectionProbability"],
  String(examples.comparison.control.detectionProbability),
);
assert.equal(exported.timestamp, records[3].timestamp);
assert.equal(exported.concurrence, "");
assert.equal(exported.provenance, "LIVE SIMULATION");
assert.equal(exported.trialSampling, "exact-probability-binomial");
assert.ok(
  historyCSV([records[2]]).includes(
    String(examples.illumination.receiverScore),
  ),
);
for (const raw of [
  "{broken",
  "null",
  '{"version":99,"records":[]}',
  '{"version":1,"records":{}}',
]) {
  storage.setItem(HISTORY_KEY, raw);
  refreshed.refresh();
  assert.equal(refreshed.getSnapshot().records.length, 0);
  assert.ok(refreshed.getSnapshot().warning);
}
assert.equal(
  decodeHistory(
    JSON.stringify({
      version: 1,
      records: [records[0], { ...records[0], engine: "demo" }],
    }),
  ).records.length,
  1,
);
assert.equal(
  decodeHistory(
    JSON.stringify({
      version: 1,
      records: [{ ...records[0], concurrence: undefined }],
    }),
  ).records.length,
  0,
);
storage.setItem("unrelated", "preserved");
for (let i = 0; i < 105; i++)
  store.append({ ...records[0], id: crypto.randomUUID() });
assert.equal(store.getSnapshot().records.length, 100);
assert.equal(decodeHistory(storage.getItem(HISTORY_KEY)).records.length, 100);
assert.ok(store.clear());
assert.equal(storage.getItem(HISTORY_KEY), null);
assert.equal(storage.getItem("unrelated"), "preserved");
refreshed.refresh();
assert.equal(refreshed.getSnapshot().records.length, 0);
const blocked = createHistoryStore(() => {
  throw Error("blocked");
});
blocked.refresh();
blocked.append(records[0]);
assert.equal(blocked.getSnapshot().records.length, 1);
assert.ok(blocked.getSnapshot().warning);
assert.equal(blocked.clear(), false);
assert.equal(blocked.getSnapshot().records.length, 1);
const quota = createHistoryStore(() => ({
  ...makeStorage(),
  setItem() {
    throw Error("quota");
  },
}));
quota.append(records[0]);
assert.equal(quota.getSnapshot().records.length, 1);
assert.ok(quota.getSnapshot().warning);
// API integration uses saved backend examples and a synthetic exact Bell response;
// these are test inputs only and are never inserted into an actual browser.
global.window = { localStorage: makeStorage() };
process.env.NEXT_PUBLIC_API_URL = "http://test.invalid";
for (const flag of ["ENTANGLEMENT", "NOISE", "ILLUMINATION", "COMPARISON"])
  process.env[`NEXT_PUBLIC_LIVE_${flag}`] = "true";
const api = require("../src/lib/api.ts");
let response;
global.fetch = async () => ({ ok: true, json: async () => response });
(async () => {
  response = entanglement;
  await api.runEntanglementSimulation({ state: "Bell Φ+", shots: 1024 });
  response = examples.noise;
  const labels = {
    depolarizing: "Depolarizing",
    amplitude_damping: "Amplitude Damping",
    phase_damping: "Phase Damping",
    readout_error: "Readout Error",
  };
  const states = {
    phi_plus: "Bell Φ+",
    phi_minus: "Bell Φ−",
    psi_plus: "Bell Ψ+",
    psi_minus: "Bell Ψ−",
  };
  await api.runNoiseSimulation({
    state: states[response.state],
    model: labels[response.model],
    strength: response.strength,
    shots: response.shots,
    seed: response.seed,
  });
  response = examples.illumination;
  await api.runIlluminationSimulation(
    JSON.parse(fs.readFileSync("backend/examples/illumination-request.json")),
  );
  response = examples.comparison;
  await api.runComparisonSimulation(
    JSON.parse(fs.readFileSync("backend/examples/comparison-request.json")),
  );
  assert.equal(historyStore.getSnapshot().records.length, 4);
  response = entanglement;
  await assert.rejects(
    api.runEntanglementSimulation({ state: "Bell Ψ+", shots: 1024 }),
  );
  response = { bad: "response" };
  await assert.rejects(
    api.runEntanglementSimulation({ state: "Bell Φ+", shots: 1024 }),
  );
  global.fetch = async () => {
    throw Error("offline");
  };
  await assert.rejects(
    api.runEntanglementSimulation({ state: "Bell Φ+", shots: 1024 }),
  );
  assert.equal(historyStore.getSnapshot().records.length, 4);
  for (const [status, message] of [
    [422, /validation error/],
    [500, /server failed/],
  ]) {
    global.fetch = async () => ({ ok: false, status });
    await assert.rejects(
      api.runEntanglementSimulation({ state: "Bell Φ+", shots: 1024 }),
      message,
    );
  }
  global.fetch = async () => {
    throw new DOMException("timeout", "TimeoutError");
  };
  await assert.rejects(
    api.runEntanglementSimulation({ state: "Bell Φ+", shots: 1024 }),
    /timed out/,
  );
  assert.equal(historyStore.getSnapshot().records.length, 4);
  for (const flag of ["ENTANGLEMENT", "NOISE", "ILLUMINATION", "COMPARISON"])
    process.env[`NEXT_PUBLIC_LIVE_${flag}`] = "false";
  process.env.NEXT_PUBLIC_DEMO_MODE = "true";
  delete require.cache[require.resolve("../src/lib/api.ts")];
  const legacyFlagsIgnored = require("../src/lib/api.ts");
  global.fetch = async () => ({ ok: true, json: async () => entanglement });
  const liveDespiteOldFlags =
    await legacyFlagsIgnored.runEntanglementSimulation({
      state: "Bell Φ+",
      shots: 1024,
    });
  assert.equal(liveDespiteOldFlags.source, "api");
  global.fetch = async () => {
    throw Error("offline");
  };
  await assert.rejects(
    legacyFlagsIgnored.runNoiseSimulation({
      model: "Depolarizing",
      strength: 0.2,
      shots: 1024,
    }),
    /Cannot reach/,
  );
  await assert.rejects(
    legacyFlagsIgnored.runIlluminationSimulation({
      targetPresent: true,
      reflectivity: 0.1,
      backgroundNoise: 0.25,
      channelNoise: 0.1,
      shots: 2048,
    }),
    /Cannot reach/,
  );
  await assert.rejects(
    legacyFlagsIgnored.runComparisonSimulation({
      reflectivity: 0.1,
      backgroundNoise: 0.25,
      channelNoise: 0.1,
      shots: 2048,
      trials: 500,
    }),
    /Cannot reach/,
  );
  assert.equal(historyStore.getSnapshot().records.length, 5);
  assert.equal(JSON.parse(encodeHistory(records)).version, 1);
  console.log(
    "PASS: four live types; failed/invalid/mismatched exclusions; obsolete demo flags ignored; HTTP 422/500 and timeout messages; refresh; filters; sorting; real example CSV values; malformed/versioned data; cap; clear; unrelated storage; blocked/quota recovery.",
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
