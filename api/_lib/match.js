// Fuzzy match a free-text query against a set of rows by a title field.
function normalize(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function findBestMatch(rows, query, field = 'title') {
  const q = normalize(query);
  if (!q || !rows?.length) return null;

  const qWords = q.split(' ').filter(Boolean);
  let best = null;
  let bestScore = 0;

  for (const row of rows) {
    const t = normalize(row[field]);
    if (!t) continue;

    let score = 0;
    if (t.includes(q) || q.includes(t)) score += 3;
    const tWords = new Set(t.split(' '));
    for (const w of qWords) if (tWords.has(w)) score += 1;

    if (score > bestScore) {
      bestScore = score;
      best = row;
    }
  }

  return bestScore > 0 ? best : null;
}
