// Run async work over items with a fixed concurrency pool.
export async function mapPool(items, concurrency, fn) {
  const list = items || [];
  if (list.length === 0) return [];

  const limit = Math.max(1, Math.min(concurrency || 1, list.length));
  const results = new Array(list.length);
  let next = 0;

  async function worker() {
    while (next < list.length) {
      const idx = next;
      next += 1;
      results[idx] = await fn(list[idx], idx);
    }
  }

  await Promise.all(Array.from({ length: limit }, () => worker()));
  return results;
}
