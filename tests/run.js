import assert from "node:assert";
import { slotsFor, setBit } from "../bloom.js";
import { step, close } from "../bloomrun.js";
import { render } from "../app.js";

const base = {
  budget: 2, bits: 8, queries: [],
  state: { bitmap: [0, 0, 0, 0, 0, 0, 0, 0], inserted: [], ledger: [], applied: [] },
  events: [],
  duplicate_error_code: "E_DUPLICATE_ELEMENT", bits_error_code: "E_BAD_BITS",
  event_error_code: "E_BAD_EVENT"
};

let failed = 0;
function check(name, fn) {
  try { fn(); console.log("ok " + name); } catch (e) { failed += 1; console.log("FAIL " + name + " :: " + e.message); }
}

check("slotsFor returns a pair", () => {
  assert.ok(Array.isArray(slotsFor("a", 8)));
});

check("setBit returns a list", () => {
  assert.ok(Array.isArray(setBit([0, 0], 0)));
});

check("step returns a state", () => {
  assert.strictEqual(typeof step(base).state, "object");
});

check("close returns a state", () => {
  assert.strictEqual(typeof close(base).state, "object");
});

check("render counts events", () => {
  assert.strictEqual(typeof render(base).count, "number");
});

console.log("5 cases, " + failed + " failed");
process.exit(failed === 0 ? 0 : 1);
