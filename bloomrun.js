// bloomrun.js：按插入预算置位并留账
import { slotsFor, setBit } from "./bloom.js";

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function errorCodes(spec) {
  return {
    duplicate: spec.duplicate_error_code || "E_DUPLICATE_ELEMENT",
    bits: spec.bits_error_code || "E_BAD_BITS",
    event: spec.event_error_code || "E_BAD_EVENT"
  };
}

function checkBits(spec) {
  if (!Number.isInteger(spec.bits) || spec.bits <= 0) {
    fail(errorCodes(spec).bits, "bits must be a positive integer");
  }
}

function cloneState(state) {
  const source = state || {};
  return {
    bitmap: (source.bitmap || []).slice(),
    inserted: (source.inserted || []).slice(),
    ledger: (source.ledger || []).slice(),
    applied: (source.applied || []).slice()
  };
}

function insertName(state, name, bits) {
  slotsFor(name, bits).forEach(function (slot) {
    state.bitmap = setBit(state.bitmap, slot);
  });
  state.inserted.push(name);
}

export function step(spec) {
  checkBits(spec);
  const codes = errorCodes(spec);
  const bits = spec.bits;
  const state = cloneState(spec.state);
  let budget = Math.max(0, Math.floor(Number(spec.budget) || 0));
  let placed = 0;

  const carried = [];
  state.ledger.forEach(function (name) {
    if (state.inserted.indexOf(name) !== -1) return;
    if (budget > 0) {
      insertName(state, name, bits);
      budget -= 1;
      placed += 1;
    } else {
      carried.push(name);
    }
  });
  state.ledger = carried;

  const events = spec.events || [];
  let judged = 0;
  events.forEach(function (event) {
    judged += 1;
    if (!event || typeof event !== "object" || event.kind !== "add" || typeof event.name !== "string") {
      fail(codes.event, "bad event");
    }
    const key = event.id !== undefined ? event.id : event.name;
    if (state.applied.indexOf(key) !== -1) return;
    if (state.inserted.indexOf(event.name) !== -1) {
      fail(codes.duplicate, "duplicate element " + event.name);
    }
    state.applied.push(key);
    if (budget > 0) {
      insertName(state, event.name, bits);
      budget -= 1;
      placed += 1;
    } else {
      state.ledger.push(event.name);
    }
  });

  return { state: state, placed: placed, ledger_before: state.ledger.length,
           ledger: state.ledger.slice(), judged: judged, judged_bound: events.length };
}

export function close(spec) {
  checkBits(spec);
  const bits = spec.bits;
  const state = cloneState(spec.state);
  let catchup = 0;
  state.ledger.forEach(function (name) {
    if (state.inserted.indexOf(name) !== -1) return;
    insertName(state, name, bits);
    catchup += 1;
  });
  state.ledger = [];
  return { state: state, catchup: catchup };
}
