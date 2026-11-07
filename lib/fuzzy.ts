/**
 * Fuzzy matcher for the command palette.
 *
 * Plain substring control (`includes`) misses the ways users actually
 * reach for commands: "date" for "Insert current date" works there, but
 * "in cd" (insert code block) or "hr" (horizontal line) do not. This
 * scores case-insensitive subsequence matches the way good launchers do:
 *
 * - every matched character contributes a base score
 * - runs of consecutive matches earn more than scattered picks
 * - matches at a word boundary (start, after space/punct, camelCase
 *   humps) beat mid-word matches
 * - skipped characters cost a capped gap penalty
 * - tighter matches win ties (exact > prefix > substring, and shorter
 *   strings beat longer ones)
 *
 * Returns null when the needle is not a subsequence — no match.
 * Zero-length queries are a neutral match for every text.
 */
export function fuzzyScore(query: string, text: string): number | null {
  if (query.length === 0) return 0;
  if (text.length === 0) return null;

  const q = query.toLowerCase();
  const t = text.toLowerCase();

  let score = 0;
  let prev = -1; // index of the last matched character in t
  let streak = 0; // length of the current consecutive run
  let qi = 0;

  for (let j = 0; j < t.length && qi < q.length; j++) {
    if (t[j] !== q[qi]) continue;

    const boundary =
      j === 0 || /[^a-z0-9]/.test(t[j - 1]);

    const consecutive = j === prev + 1;
    streak = consecutive ? streak + 1 : 1;

    score += 1;
    if (consecutive) score += Math.min(6, streak * 2);
    if (boundary) score += 5;
    // camelCase humps are boundaries too, but only mid-word (the
    // after-separator case is already handled above).
    else if (text[j] !== text[j].toLowerCase()) score += 3;
    if (prev >= 0 && !consecutive) {
      score -= Math.min(3, (j - prev - 1) * 0.5);
    }

    prev = j;
    qi++;
  }

  if (qi < q.length) return null;

  if (t === q) score += 50;
  else if (t.startsWith(q)) score += 10;
  else if (t.includes(q)) score += 5;
  // Penalize sprawl so "date" prefers the short label over a long one.
  score -= (t.length - q.length) * 0.05;

  return score;
}
