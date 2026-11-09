export type DiffOp =
  | { type: "ctx"; text: string }
  | { type: "add"; text: string }
  | { type: "del"; text: string };

/** Simple line-based diff (LCS) producing +/-/context ops. */
export function diffLines(oldText: string, newText: string): DiffOp[] {
  if (oldText === newText) {
    return oldText ? oldText.split("\n").map((t) => ({ type: "ctx", text: t })) : [];
  }
  const a = oldText.replace(/\r\n/g, "\n").split("\n");
  const b = newText.replace(/\r\n/g, "\n").split("\n");
  const n = a.length;
  const m = b.length;
  // Guard very large inputs (keep UI responsive).
  if (n * m > 250000) {
    return [
      ...a.map((t) => ({ type: "del" as const, text: t })),
      ...b.map((t) => ({ type: "add" as const, text: t })),
    ];
  }
  const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const ops: DiffOp[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      ops.push({ type: "ctx", text: a[i++] });
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      ops.push({ type: "del", text: a[i++] });
    } else {
      ops.push({ type: "add", text: b[j++] });
    }
  }
  while (i < n) ops.push({ type: "del", text: a[i++] });
  while (j < m) ops.push({ type: "add", text: b[j++] });

  // Collapse long unchanged runs, keep a little context around changes.
  const changed = ops.map((o) => o.type !== "ctx");
  const keep = new Array(ops.length).fill(false);
  for (let k = 0; k < ops.length; k++) {
    if (!changed[k]) continue;
    for (let d = -2; d <= 2; d++) {
      const x = k + d;
      if (x >= 0 && x < ops.length) keep[x] = true;
    }
  }
  const compact: DiffOp[] = [];
  let skipping = false;
  for (let k = 0; k < ops.length; k++) {
    if (keep[k]) {
      skipping = false;
      compact.push(ops[k]);
    } else if (!skipping) {
      skipping = true;
      compact.push({ type: "ctx", text: "…" });
    }
  }
  return compact.length ? compact : ops;
}
