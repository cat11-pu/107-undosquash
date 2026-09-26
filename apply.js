// apply.js：按顺序执行操作序列（跳过已应用、合并、截断、撤销与重做）
import { push, undo, redo } from "./stack.js";

function badTargetError() {
  const error = new Error("E_BAD_TARGET");
  error.code = "E_BAD_TARGET";
  return error;
}

export function applyOps(items, ops, applied, options) {
  const opts = options || {};
  const window = opts.merge_window == null ? 0 : opts.merge_window;
  const limit = opts.limit == null ? Infinity : opts.limit;
  const state = {};
  for (const item of items || []) state[item.id] = item.value;
  const done = new Set(applied || []);
  let stack = [];
  let redoStack = [];
  let merges = 0;
  let truncated = 0;
  let undone = 0;
  let redone = 0;
  let skipped = 0;

  for (const op of ops || []) {
    if (done.has(op.op_id)) { skipped += 1; continue; }
    if (!Object.prototype.hasOwnProperty.call(state, op.item)) throw badTargetError();
    if (redoStack.length) {
      truncated += redoStack.length;
      redoStack = [];
    }
    const before = state[op.item];
    state[op.item] = op.value;
    const result = push(stack, { item: op.item, before: before, after: op.value, merges: 0 }, window, limit);
    stack = result.stack;
    if (result.merged) merges += 1;
    truncated += result.truncated;
    done.add(op.op_id);
  }

  if (opts.undos) {
    const result = undo(stack, redoStack, state, opts.undos);
    stack = result.stack;
    redoStack = result.redo;
    undone = result.undone;
  }
  if (opts.redos) {
    const result = redo(stack, redoStack, state, opts.redos);
    stack = result.stack;
    redoStack = result.redo;
    redone = result.redone;
  }

  return {
    items: state, stack: stack, redo: redoStack,
    merges: merges, truncated: truncated, undone: undone, redone: redone, skipped: skipped
  };
}
