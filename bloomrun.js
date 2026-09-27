// bloomrun.js：按插入预算置位并留账
import { slotsFor, setBit } from "./bloom.js";

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function codes(spec) {
  return {
    duplicate: spec.duplicate_error_code || "E_DUPLICATE_ELEMENT",
    bits: spec.bits_error_code || "E_BAD_BITS",
    event: spec.event_error_code || "E_BAD_EVENT"
  };
}

function checkBits(spec) {
  if (!Number.isInteger(spec.bits) || spec.bits <= 0) {
    fail(codes(spec).bits, "bits must be a positive integer");
  }
}

function copyState(state) {
  return {
    bitmap: state.bitmap.slice(),
    inserted: state.inserted.slice(),
    ledger: state.ledger.slice(),
    applied: state.applied.slice()
  };
}

function insertOne(state, name, bits) {
  slotsFor(name, bits).forEach(function (slot) {
    state.bitmap = setBit(state.bitmap, slot);
  });
  state.inserted.push(name);
}

export function step(spec) {
  checkBits(spec);
  const err = codes(spec);
  const state = copyState(spec.state);
  const events = spec.events || [];
  let budget = typeof spec.budget === "number" ? spec.budget : 0;
  let placed = 0;
  let judged = 0;
  events.forEach(function (event) {
    if (!event || typeof event !== "object" || event.kind !== "add" || typeof event.name !== "string") {
      fail(err.event, "bad event");
    }
    if (state.applied.indexOf(event.id) !== -1) return;
    if (state.inserted.indexOf(event.name) !== -1 || state.ledger.indexOf(event.name) !== -1) {
      fail(err.duplicate, "duplicate element: " + event.name);
    }
    judged += 1;
    if (budget > 0) {
      budget -= 1;
      insertOne(state, event.name, spec.bits);
      placed += 1;
    } else {
      state.ledger.push(event.name);
    }
    state.applied.push(event.id);
  });
  return { state: state, placed: placed, ledger_before: state.ledger.length,
           ledger: state.ledger.slice(), judged: judged, judged_bound: events.length };
}

export function close(spec) {
  checkBits(spec);
  const state = copyState(spec.state);
  let catchup = 0;
  while (state.ledger.length > 0) {
    const name = state.ledger.shift();
    if (state.inserted.indexOf(name) !== -1) continue;
    insertOne(state, name, spec.bits);
    catchup += 1;
  }
  return { state: state, catchup: catchup };
}
