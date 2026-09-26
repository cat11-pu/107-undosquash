// stack.js：撤销栈的压入与合并（基线：不合并、不上限、撤销直接清空）
export function push(stack, entry, window, limit) {
  stack.push(entry);
  return { stack: stack, merged: false, truncated: 0 };
}

export function undo(stack, redo, items, count) {
  return { stack: [], redo: [], items: items, undone: 0 };
}

export function redo(stack, redo, items, count) {
  return { stack: stack, redo: [], items: items, redone: 0 };
}
