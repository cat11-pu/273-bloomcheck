// ui.js：操作面板与视图（原生 DOM，无弹窗）
import { render } from "./app.js";

export function mount(spec, parts) {
  parts.log.textContent = "事件 " + (spec.events || []).length + " 条，位数 " + (spec.bits || 0) + "，本轮插入预算 " + (spec.budget || 0) + " 个元素。";

  function draw() {
    let view = null;
    try {
      view = render(spec);
    } catch (error) {
      parts.out.textContent = String(error && error.code ? error.code : error);
      parts.log.textContent = "跑不动：" + String(error && error.message ? error.message : error);
      return;
    }
    parts.out.textContent = JSON.stringify(view, null, 1);
    parts.stage.textContent = "";
    const bitsLine = document.createElement("div");
    bitsLine.className = "row";
    const head = document.createElement("span");
    head.textContent = "位数组 " + JSON.stringify(view.bitmap);
    bitsLine.appendChild(head);
    const chip = document.createElement("span");
    chip.className = "chip ok";
    chip.textContent = "置位 " + view.placed;
    bitsLine.appendChild(chip);
    parts.stage.appendChild(bitsLine);
    (view.definitely_absent || []).forEach(function (name) {
      const line = document.createElement("div");
      line.className = "row";
      const head = document.createElement("span");
      head.textContent = "查询 " + name + " 一定不在";
      line.appendChild(head);
      const mark = document.createElement("span");
      mark.className = "chip ok";
      mark.textContent = "有位为零";
      line.appendChild(mark);
      parts.stage.appendChild(line);
    });
    (view.maybe_present || []).forEach(function (name) {
      const line = document.createElement("div");
      line.className = "row";
      const head = document.createElement("span");
      head.textContent = "查询 " + name + " 可能在";
      line.appendChild(head);
      const mark = document.createElement("span");
      mark.className = "chip warn";
      mark.textContent = "全是置位";
      line.appendChild(mark);
      parts.stage.appendChild(line);
    });
    (view.ledger || []).forEach(function (name) {
      const line = document.createElement("div");
      line.className = "row";
      const head = document.createElement("span");
      head.textContent = "元素 " + name + " 压在账上";
      line.appendChild(head);
      const mark = document.createElement("span");
      mark.className = "chip warn";
      mark.textContent = "等收尾";
      line.appendChild(mark);
      parts.stage.appendChild(line);
    });
    parts.legend.textContent = "已插入 " + view.inserted + " 个元素，首轮插入 "
      + view.placed_first + " 个，二档 " + view.placed_wide + " 个，收尾前账 "
      + view.ledger_before + " 个，收尾补齐 " + view.catchup + " 个，收尾后账 " + view.ledger_after + " 个";
    parts.log.textContent = "工作计数 " + view.judged + " / 上界 " + view.judged_bound
      + "，重放新插入 " + view.replay_new + "，与全量对照差异 " + view.full_diff;
  }

  const budgetInput = document.createElement("input");
  budgetInput.type = "number";
  budgetInput.value = "2";
  parts.controls.appendChild(budgetInput);

  const runButton = document.createElement("button");
  runButton.className = "primary";
  runButton.textContent = "跑一遍";
  runButton.addEventListener("click", draw);
  parts.controls.appendChild(runButton);

  const budgetButton = document.createElement("button");
  budgetButton.textContent = "把插入预算换成输入框的值";
  budgetButton.addEventListener("click", function () {
    const next = Number(budgetInput.value);
    spec.budget = Number.isFinite(next) ? Math.max(1, Math.round(next)) : 1;
    draw();
  });
  parts.controls.appendChild(budgetButton);

  const dropButton = document.createElement("button");
  dropButton.textContent = "删最后一条事件";
  dropButton.addEventListener("click", function () {
    spec.events = (spec.events || []).slice(0, Math.max(0, (spec.events || []).length - 1));
    draw();
  });
  parts.controls.appendChild(dropButton);

  draw();
}
