// app.js：渲染结果
import { applyOps } from "./apply.js";

export function render(spec) {
  const options = { merge_window: spec.merge_window, limit: spec.limit, undos: spec.undos, redos: spec.redos };
  const first = applyOps(spec.items || [], spec.ops || [], spec.applied || [], options);
  const values = (spec.items || []).map(function (item) { return [item.id, (first.items || {})[item.id]]; });
  const again = applyOps(
    (spec.items || []).map(function (item) { return { id: item.id, value: (first.items || {})[item.id] }; }),
    spec.ops || [], (spec.ops || []).map(function (op) { return op.op_id; }),
    { merge_window: spec.merge_window, limit: spec.limit, undos: 0, redos: 0 });
  let diff = 0;
  for (const item of spec.items || []) {
    if ((again.items || {})[item.id] !== (first.items || {})[item.id]) diff += 1;
  }
  return {
    values: values,
    stack: first.stack,
    redo_depth: (first.redo || []).length,
    merges: first.merges,
    truncated: first.truncated,
    undone: first.undone,
    skipped: first.skipped,
    replay_diff: diff
  };
}
