// apply.js：按顺序执行操作序列，维护撤销/重做栈与各项计数
import { push, undo, redo } from "./stack.js";

function badTargetError() {
  const error = new Error("E_BAD_TARGET");
  error.code = "E_BAD_TARGET";
  return error;
}

export function applyOps(items, ops, applied, options) {
  const opts = options || {};
  const mergeWindow = opts.merge_window == null ? 0 : opts.merge_window;
  const limit = opts.limit == null ? Infinity : opts.limit;
  const values = {};
  for (const item of items || []) values[item.id] = item.value;
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
    if (!Object.prototype.hasOwnProperty.call(values, op.item)) throw badTargetError();
    if (redoStack.length) redoStack = [];
    const before = values[op.item];
    values[op.item] = op.value;
    const result = push(stack, { item: op.item, before: before, after: op.value, merges: 0 }, mergeWindow, limit);
    stack = result.stack;
    if (result.merged) merges += 1;
    truncated += result.truncated;
    done.add(op.op_id);
  }

  if (opts.undos) {
    const back = undo(stack, redoStack, values, opts.undos);
    stack = back.stack;
    redoStack = back.redo;
    undone = back.undone;
  }
  if (opts.redos) {
    const fwd = redo(stack, redoStack, values, opts.redos);
    stack = fwd.stack;
    redoStack = fwd.redo;
    redone = fwd.redone;
  }

  return { items: values, stack: stack, redo: redoStack, merges: merges, truncated: truncated, undone: undone, redone: redone, skipped: skipped };
}
