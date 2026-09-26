// apply.js：操作序列（基线：不执行操作、不清重做栈）
import { push, undo, redo } from "./stack.js";

export function applyOps(items, ops, applied, options) {
  return { items: items, stack: [], redo: [], merges: 0, truncated: 0, undone: 0, redone: 0, skipped: 0 };
}
