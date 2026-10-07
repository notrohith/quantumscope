/* eslint-disable @typescript-eslint/no-require-imports -- Existing TypeScript compiler plus Node assertions; no new test framework. */
const fs = require("node:fs");
const ts = require("typescript");
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
require.extensions[".ts"] = (module, filename) =>
  module._compile(
    ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    filename,
  );
const { bellPreparation } = require("../src/lib/scientific-copy.ts");
const { bellStateIds } = require("../src/lib/bell-states.ts");
const backend = JSON.parse(
  execFileSync(
    ".venv/bin/python",
    [
      "-c",
      `import json
from app.simulation.entanglement import prepare_bell_state
from app.models.schemas import BellState
out={}
for state in BellState:
 c=prepare_bell_state(state)
 out[state.value]=[[i.operation.name,[c.find_bit(q).index for q in i.qubits]] for i in c.data]
print(json.dumps(out))`,
    ],
    { cwd: "backend", encoding: "utf8" },
  ),
);
for (const [label, gates] of Object.entries(bellPreparation)) {
  const expected = [
    ["h", [0]],
    ["cx", [0, 1]],
    ...(gates.x ? [["x", [1]]] : []),
    ...(gates.z ? [["z", [0]]] : []),
  ];
  assert.deepEqual(backend[bellStateIds[label]], expected, label);
}
console.log(
  "PASS: all four frontend Bell-gate variants match backend gate order and qubits.",
);
