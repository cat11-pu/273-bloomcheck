import fs from "node:fs";
import { slotsFor, setBit } from "./bloom.js";
import { step, close } from "./bloomrun.js";

// 验收断言：上面每条值收进 emit，最后与期望值逐项比对，不符就非零退出。
const __lines = [];
function emit(label, value) { __lines.push([String(label).replace(/ =$/, ""), value]); }


const spec = JSON.parse(fs.readFileSync(process.argv[2] || "sample/bloom.json", "utf8"));
const events = spec.events || [];
const half = Math.ceil(events.length / 2);
const first = step(spec);
const closed = close(Object.assign({}, spec, { state: first.state }));
const r1 = step(Object.assign({}, spec, { events: events.slice(0, half) }));
const r2 = step(Object.assign({}, spec, { state: r1.state, events: events.slice(half) }));
const closedTwo = close(Object.assign({}, spec, { state: r2.state }));
const replay = step(Object.assign({}, spec, { state: closed.state }));
const wide = step(Object.assign({}, spec, { budget: spec.budget + 2 }));
const full = step(Object.assign({}, spec, { events: events, budget: events.length + 2 }));
const fullClosed = close(Object.assign({}, spec, { state: full.state }));
const fingerprint = function (state) {
  return JSON.stringify({
    bitmap: state.bitmap, inserted: state.inserted.slice().sort(), ledger: state.ledger,
    applied: state.applied.length
  });
};
const queries = spec.queries || [];
const absent = [];
const maybe = [];
queries.forEach(function (name) {
  const hits = slotsFor(name, spec.bits).map(function (slot) { return closed.state.bitmap[slot] || 0; });
  if (hits.indexOf(0) !== -1) absent.push(name);
  else maybe.push(name);
});

emit("收尾后位数组 =", JSON.stringify(closed.state.bitmap));
emit("收尾后置位个数 =", closed.state.bitmap.filter(function (value) { return value > 0; }).length);
emit("收尾后已插入元素数 =", closed.state.inserted.length);
emit("收尾后一定不在 =", JSON.stringify(absent));
emit("收尾后可能在 =", JSON.stringify(maybe));
emit("首轮插入个数 =", first.placed);
emit("二档插入个数 =", wide.placed);
emit("两个预算档插入不同 =", first.placed !== wide.placed);
emit("收尾前待插入账 =", first.ledger_before);
emit("压在账上的元素 =", JSON.stringify(first.ledger));
emit("收尾补齐个数 =", closed.catchup);
emit("收尾后待插入账 =", closed.state.ledger.length);
emit("拆两轮中间态不同 =", fingerprint(r2.state) !== fingerprint(first.state));
emit("拆两轮收尾态一致 =", fingerprint(closedTwo.state) === fingerprint(closed.state));
emit("重放新插入 =", replay.placed);
emit("工作计数未超上界 =", first.judged <= first.judged_bound);
emit("与全量对照差异 =", fingerprint(closed.state) === fingerprint(fullClosed.state) ? 0 : 1);


// ---- 异常路径探针：真调用实现，看它报出什么码（不是从样例里抄）----
try {
  step(Object.assign({}, { budget: 2, bits: 8, queries: [],
    state: { bitmap: [0, 0, 0, 0, 0, 0, 0, 0], inserted: ["a"], ledger: [], applied: [] },
    events: [{ id: 1, kind: "add", name: "a" }] }));
  emit("重复元素报码", "没有报错");
} catch (error) {
  emit("重复元素报码", error && error.code ? error.code : String(error.message));
}
try {
  step(Object.assign({}, { budget: 2, bits: 0, queries: [],
    state: { bitmap: [], inserted: [], ledger: [], applied: [] },
    events: [{ id: 1, kind: "add", name: "a" }] }));
  emit("位数不合法报码", "没有报错");
} catch (error) {
  emit("位数不合法报码", error && error.code ? error.code : String(error.message));
}
try {
  step(Object.assign({}, { budget: 2, bits: 8, queries: [],
    state: { bitmap: [0, 0, 0, 0, 0, 0, 0, 0], inserted: [], ledger: [], applied: [] },
    events: [{ id: 1, kind: "peek", name: "a" }] }));
  emit("事件不合法报码", "没有报错");
} catch (error) {
  emit("事件不合法报码", error && error.code ? error.code : String(error.message));
}


// ---- 期望值（参考模型算出，与题面给的验收数值一致）----
const EXPECTED = {
  "收尾后位数组": [
    0,
    1,
    1,
    1,
    1,
    0,
    0,
    1
  ],
  "收尾后置位个数": 5,
  "收尾后已插入元素数": 3,
  "收尾后一定不在": [
    "h"
  ],
  "收尾后可能在": [
    "a",
    "b"
  ],
  "首轮插入个数": 2,
  "二档插入个数": 3,
  "两个预算档插入不同": true,
  "收尾前待插入账": 1,
  "压在账上的元素": [
    "c"
  ],
  "收尾补齐个数": 1,
  "收尾后待插入账": 0,
  "拆两轮中间态不同": true,
  "拆两轮收尾态一致": true,
  "重放新插入": 0,
  "工作计数未超上界": true,
  "与全量对照差异": 0,
  "重复元素报码": "E_DUPLICATE_ELEMENT",
  "位数不合法报码": "E_BAD_BITS",
  "事件不合法报码": "E_BAD_EVENT"
};
// 有的值在收进来之前已经 stringify 过，比较前先试着解析回来，避免类型错配把正确实现判成不过。
function __same(got, want) {
  if (typeof got === "string") {
    try { const parsed = JSON.parse(got); if (JSON.stringify(parsed) === JSON.stringify(want)) return true; } catch (error) { /* 不是 JSON 就按原文比 */ }
  }
  return JSON.stringify(got) === JSON.stringify(want);
}
let __bad = 0;
for (const [label, want] of Object.entries(EXPECTED)) {
  const found = __lines.find((pair) => pair[0] === label);
  if (!found) { __bad += 1; console.log("缺失验收项 " + label); continue; }
  const got = found[1];
  if (__same(got, want)) { console.log("一致 " + label + " = " + JSON.stringify(got)); }
  else { __bad += 1; console.log("不一致 " + label + " 期望 " + JSON.stringify(want) + " 实际 " + JSON.stringify(got)); }
}
console.log("验收项 " + (Object.keys(EXPECTED).length - __bad) + "/" + Object.keys(EXPECTED).length + " 通过");
process.exit(__bad === 0 ? 0 : 1);
