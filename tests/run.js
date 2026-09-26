import assert from "node:assert";
import { push, undo, redo } from "../stack.js";
import { applyOps } from "../apply.js";
import { render } from "../app.js";

let failed = 0;
function check(name, fn) {
  try { fn(); console.log("ok " + name); } catch (e) { failed += 1; console.log("FAIL " + name + " :: " + e.message); }
}

const items = [{ id: "a", value: 1 }];
const ops = [{ op_id: "o1", item: "a", value: 2 }];
const options = { merge_window: 2, limit: 3, undos: 0, redos: 0 };

check("push returns a stack", () => {
  assert.ok(Array.isArray(push([], { item: "a", before: 1, after: 2 }, 2, 3).stack));
});

check("undo returns items", () => {
  assert.strictEqual(typeof undo([{ item: "a", before: 1, after: 2, merges: 0 }], [], { a: 2 }, 1).items, "object");
});

check("redo returns a count", () => {
  assert.strictEqual(typeof redo([], [{ item: "a", before: 1, after: 2, merges: 0 }], { a: 1 }, 1).redone, "number");
});

check("applyOps returns items", () => {
  assert.strictEqual(typeof applyOps(items, ops, [], options).items, "object");
});

check("applyOps reports merges", () => {
  assert.strictEqual(typeof applyOps(items, ops, [], options).merges, "number");
});

check("render exposes replay_diff", () => {
  const spec = { items: items, ops: ops, applied: [], merge_window: 2, limit: 3, undos: 0, redos: 0 };
  assert.strictEqual(typeof render(spec).replay_diff, "number");
});

console.log("6 cases, " + failed + " failed");
process.exit(failed === 0 ? 0 : 1);
