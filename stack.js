// stack.js：撤销栈的压入、合并、截断、撤销与重做
function emptyStackError() {
  const error = new Error("E_EMPTY_STACK");
  error.code = "E_EMPTY_STACK";
  return error;
}

export function push(stack, entry, window, limit) {
  let merged = false;
  let truncated = 0;
  const top = stack[stack.length - 1];
  if (top && top.item === entry.item && (top.merges || 0) < window) {
    top.after = entry.after;
    top.merges = (top.merges || 0) + 1;
    merged = true;
  } else {
    entry.merges = entry.merges || 0;
    stack.push(entry);
  }
  while (stack.length > limit) {
    stack.shift();
    truncated += 1;
  }
  return { stack: stack, merged: merged, truncated: truncated };
}

export function undo(stack, redo, items, count) {
  let undone = 0;
  for (let index = 0; index < count; index += 1) {
    if (!stack.length) throw emptyStackError();
    const entry = stack.pop();
    items[entry.item] = entry.before;
    redo.push(entry);
    undone += 1;
  }
  return { stack: stack, redo: redo, items: items, undone: undone };
}

export function redo(stack, redo, items, count) {
  let redone = 0;
  for (let index = 0; index < count; index += 1) {
    if (!redo.length) throw emptyStackError();
    const entry = redo.pop();
    items[entry.item] = entry.after;
    stack.push(entry);
    redone += 1;
  }
  return { stack: stack, redo: redo, items: items, redone: redone };
}
