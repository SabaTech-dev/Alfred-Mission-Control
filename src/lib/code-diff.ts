/**
 * Unified line-diff helpers — dependency-free LCS-based diff used by the Code
 * tab's diff viewer.
 *
 * @module code-diff
 */

export type DiffLineType = "context" | "add" | "remove";

export interface DiffLine {
  type: DiffLineType;
  text: string;
}

export interface DiffSummary {
  added: number;
  removed: number;
}

function splitLines(input: string): string[] {
  if (!input) return [];
  // Normalize CRLF then split on \n; drop the trailing empty string produced
  // by a final newline so it doesn't appear as a spurious diff line.
  const normalized = input.replace(/\r\n/g, "\n").split("\n");
  if (normalized.length > 0 && normalized[normalized.length - 1] === "") {
    normalized.pop();
  }
  return normalized;
}

/**
 * Compute a unified line-level diff between two strings using the classic
 * Longest Common Subsequence dynamic-programming algorithm. Adds are emitted
 * immediately after the removes they replace (git-style ordering).
 */
export function computeUnifiedDiff(before: string, after: string): DiffLine[] {
  const a = splitLines(before);
  const b = splitLines(after);

  const n = a.length;
  const m = b.length;

  // dp[i][j] = length of LCS of a[i..] and b[j..]
  const dp: number[][] = Array.from({ length: n + 1 }, () =>
    new Array<number>(m + 1).fill(0),
  );
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      if (a[i] === b[j]) {
        dp[i][j] = dp[i + 1][j + 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }

  const result: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      result.push({ type: "context", text: a[i] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      result.push({ type: "remove", text: a[i] });
      i++;
    } else {
      result.push({ type: "add", text: b[j] });
      j++;
    }
  }
  while (i < n) {
    result.push({ type: "remove", text: a[i] });
    i++;
  }
  while (j < m) {
    result.push({ type: "add", text: b[j] });
    j++;
  }
  return result;
}

/** Count added/removed lines in a diff. */
export function summarizeDiff(lines: DiffLine[]): DiffSummary {
  let added = 0;
  let removed = 0;
  for (const line of lines) {
    if (line.type === "add") added++;
    else if (line.type === "remove") removed++;
  }
  return { added, removed };
}
