// ui.js：撤销栈控制台（值条 + 栈视图 + 逐步执行）
import { push, undo, redo } from "./stack.js";

export function mount(spec, parts) {
  let queue = (spec.ops || []).map(function (op) { return Object.assign({}, op); });
  let options = { merge_window: spec.merge_window, limit: spec.limit, undos: 0, redos: 0 };
  let state = { items: {}, stack: [], redo: [], merges: 0, truncated: 0, undone: 0, note: "还没开始" };
  for (const item of spec.items || []) state.items[item.id] = item.value;

  function step(kind) {
    if (kind === "next") {
      if (!queue.length) { state.note = "没有待执行的操作了"; return; }
      const op = queue.shift();
      if (!Object.prototype.hasOwnProperty.call(state.items, op.item)) {
        state.note = "执行 " + op.op_id + " 失败：未知元素 " + op.item + "（E_BAD_TARGET）";
        return;
      }
      let note = "执行了 " + op.op_id + "：" + op.item + " = " + op.value;
      if (state.redo.length) { state.redo = []; note += "（清空了重做栈）"; }
      const result = push(state.stack,
        { item: op.item, before: state.items[op.item], after: op.value, merges: 0 },
        options.merge_window, options.limit);
      state.items[op.item] = op.value;
      state.stack = result.stack;
      if (result.merged) { state.merges += 1; note += "（并入了上一条）"; }
      state.truncated += result.truncated;
      if (result.truncated) note += "（挤掉了最老的 " + result.truncated + " 条）";
      state.note = note;
      return;
    }
    if (kind === "undo") {
      if (!state.stack.length) { state.note = "撤销栈是空的"; return; }
      try {
        const result = undo(state.stack, state.redo, state.items, 1);
        state.stack = result.stack;
        state.redo = result.redo;
        state.items = result.items;
        state.undone += result.undone;
        state.note = "撤销了一次";
      } catch (error) {
        state.note = "撤销失败：" + (error.code || error.message);
      }
    } else {
      if (!state.redo.length) { state.note = "重做栈是空的"; return; }
      try {
        const result = redo(state.stack, state.redo, state.items, 1);
        state.stack = result.stack;
        state.redo = result.redo;
        state.items = result.items;
        state.note = "重做了一次";
      } catch (error) {
        state.note = "重做失败：" + (error.code || error.message);
      }
    }
  }

  function entries(title, list, kind) {
    const box = document.createElement("div");
    box.style.marginTop = "8px";
    const head = document.createElement("div");
    head.textContent = title + "（" + list.length + " 条）";
    head.style.fontSize = "12px";
    head.style.color = "#5b6474";
    box.appendChild(head);
    list.forEach(function (entry, index) {
      const row = document.createElement("div");
      row.className = "row";
      const tag = document.createElement("span");
      tag.textContent = (kind === "undo" ? index + 1 : index + 1) + ". " + entry.item + " " + entry.before + " → " + entry.after
        + (entry.merges ? "（合并 " + entry.merges + " 次）" : "");
      row.appendChild(tag);
      box.appendChild(row);
    });
    return box;
  }

  function draw() {
    parts.stage.innerHTML = "";
    const values = Object.keys(state.items);
    const top = Math.max.apply(null, values.map(function (id) { return state.items[id]; }).concat([1]));
    for (const id of values) {
      const row = document.createElement("div");
      row.className = "row";
      const name = document.createElement("span");
      name.textContent = id;
      name.style.width = "28px";
      row.appendChild(name);
      const track = document.createElement("div");
      track.style.flex = "1";
      track.style.height = "20px";
      track.style.background = "#f1f4f9";
      track.style.borderRadius = "5px";
      track.style.position = "relative";
      const bar = document.createElement("div");
      bar.style.position = "absolute";
      bar.style.left = "0";
      bar.style.top = "0";
      bar.style.bottom = "0";
      bar.style.width = Math.round((state.items[id] / top) * 180) + 40 + "px";
      bar.style.background = "#2f6fed";
      bar.style.borderRadius = "5px";
      bar.style.color = "#fff";
      bar.style.fontSize = "11px";
      bar.style.lineHeight = "20px";
      bar.style.paddingLeft = "6px";
      bar.textContent = state.items[id];
      track.appendChild(bar);
      row.appendChild(track);
      parts.stage.appendChild(row);
    }
    parts.stage.appendChild(entries("撤销栈", state.stack, "undo"));
    parts.stage.appendChild(entries("重做栈", state.redo, "redo"));
    parts.legend.innerHTML = "";
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.textContent = "合并 " + state.merges + " 次 · 截断 " + state.truncated + " 条 · 撤销 " + state.undone + " 次";
    parts.legend.appendChild(chip);
    const chip2 = document.createElement("span");
    chip2.className = "chip";
    chip2.textContent = "还剩 " + queue.length + " 个操作";
    chip2.style.marginLeft = "8px";
    parts.legend.appendChild(chip2);
    parts.out.textContent = JSON.stringify({
      values: Object.keys(state.items).map(function (id) { return [id, state.items[id]]; }),
      stack: state.stack.map(function (entry) { return [entry.item, entry.before, entry.after, entry.merges || 0]; }),
      redo_depth: state.redo.length, merges: state.merges, truncated: state.truncated, undone: state.undone
    }, null, 1);
    parts.log.textContent = state.note + "（历史上限 " + options.limit + " 条、合并窗口 " + options.merge_window + " 次）";
  }

  function field(labelText, value, onChange) {
    const label = document.createElement("label");
    label.textContent = labelText;
    const input = document.createElement("input");
    input.type = "number";
    input.min = "1";
    input.value = String(value);
    input.addEventListener("change", function () {
      onChange(Math.max(1, Number(input.value) || 1));
      draw();
    });
    parts.controls.appendChild(label);
    parts.controls.appendChild(input);
  }

  function build() {
    parts.controls.innerHTML = "";
    const next = document.createElement("button");
    next.className = "primary";
    next.textContent = "执行下一个操作";
    next.addEventListener("click", function () { step("next"); draw(); });
    const all = document.createElement("button");
    all.textContent = "一次跑完";
    all.addEventListener("click", function () { while (queue.length) step("next"); draw(); });
    const back = document.createElement("button");
    back.textContent = "撤销一次";
    back.addEventListener("click", function () { step("undo"); draw(); });
    const fwd = document.createElement("button");
    fwd.textContent = "重做一次";
    fwd.addEventListener("click", function () { step("redo"); draw(); });
    const reset = document.createElement("button");
    reset.textContent = "重置";
    reset.addEventListener("click", function () {
      queue = (spec.ops || []).map(function (op) { return Object.assign({}, op); });
      state = { items: {}, stack: [], redo: [], merges: 0, truncated: 0, undone: 0, note: "已重置" };
      for (const item of spec.items || []) state.items[item.id] = item.value;
      draw();
    });
    for (const button of [next, all, back, fwd, reset]) parts.controls.appendChild(button);
    field("历史上限（条）", options.limit, function (value) { options.limit = value; });
    field("合并窗口（同元素最多合并几次）", options.merge_window, function (value) { options.merge_window = value; });
  }

  build();
  draw();
}
