/**
 * Run an async mapper over a list, at most `limit` in flight at once.
 *
 * `Promise.all(list.map(fn))` opens every connection simultaneously. For a hundred
 * recipe lookups from a phone that means a hundred parallel sockets: the browser queues
 * them anyway, the third-party API sees a burst it may throttle, and the slowest request
 * still gates the result. A small window is faster in practice and much politer.
 *
 * Results keep the input order, so callers can zip them against the source list.
 */
export async function mapWithLimit<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;

  async function worker(): Promise<void> {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await fn(items[i], i);
    }
  }

  // Never start more workers than there is work to do.
  const workers = Array.from({ length: Math.min(limit, items.length) }, worker);
  await Promise.all(workers);
  return results;
}
