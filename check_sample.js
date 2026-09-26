import fs from "node:fs";
import { render } from "./app.js";
import { applyOps } from "./apply.js";

// 验收断言：上面每条值收进 emit，最后与期望值逐项比对，不符就非零退出。
const __lines = [];
function emit(label, value) { __lines.push([String(label).replace(/ =$/, ""), value]); }


const spec = JSON.parse(fs.readFileSync(process.argv[2] || "sample/undo.json", "utf8"));
const view = render(spec);

emit("最终值 =", JSON.stringify(view.values));
emit("撤销栈 =", JSON.stringify(view.stack.map(function (entry) {
  return [entry.item, entry.before, entry.after, entry.merges || 0];
})));
emit("重做栈条数 =", view.redo_depth);
emit("合并数 =", view.merges);
emit("截断数 =", view.truncated);
emit("撤销次数 =", view.undone);
emit("跳过操作数 =", view.skipped);
emit("重放差异 =", view.replay_diff);


// ---- 异常路径探针：真调用实现，看它报出什么码（不是从样例里抄）----
try {
  const bad = applyOps([{ id: "a", value: 1 }], [{ op_id: "ox", item: "ghost", value: 2 }], [],
    { merge_window: 2, limit: 3, undos: 0, redos: 0 });
  emit("未知元素错误码 =", bad && bad.code ? bad.code : "no-error");
} catch (error) {
  emit("未知元素错误码 =", error.code || error.message);
}
try {
  const empty = applyOps([{ id: "a", value: 1 }], [], [],
    { merge_window: 2, limit: 3, undos: 1, redos: 0 });
  emit("空撤销栈错误码 =", empty && empty.code ? empty.code : "no-error");
} catch (error) {
  emit("空撤销栈错误码 =", error.code || error.message);
}
try {
  const empty2 = applyOps([{ id: "a", value: 1 }], [{ op_id: "oz", item: "a", value: 2 }], [],
    { merge_window: 2, limit: 3, undos: 0, redos: 1 });
  emit("空重做栈错误码 =", empty2 && empty2.code ? empty2.code : "no-error");
} catch (error) {
  emit("空重做栈错误码 =", error.code || error.message);
}


// ---- 期望值（参考模型算出，与题面给的验收数值一致）----
const EXPECTED = {
  "最终值": [
    [
      "a",
      30
    ],
    [
      "b",
      26
    ]
  ],
  "撤销栈": [
    [
      "b",
      20,
      26,
      0
    ],
    [
      "a",
      18,
      30,
      0
    ]
  ],
  "重做栈条数": 0,
  "合并数": 1,
  "截断数": 1,
  "撤销次数": 1,
  "跳过操作数": 1,
  "重放差异": 0,
  "未知元素错误码": "E_BAD_TARGET",
  "空撤销栈错误码": "E_EMPTY_STACK",
  "空重做栈错误码": "E_EMPTY_STACK"
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
