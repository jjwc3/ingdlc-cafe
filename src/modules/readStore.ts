/**
 * Read-article history.
 *
 * Kept in chrome.storage.local under one key per cafe (`read:{cafeId}`).
 *
 * The original (INGDLC for SOOP) packed every setting and every cafe's history
 * into a single storage.sync `config` key. sync caps an item at 8,192 bytes, so
 * around a thousand articles overflowed it and settings stopped saving; it also
 * rewrote the whole config per article, hitting the 120 writes/minute cap.
 * local (10MB) plus per-cafe keys and a cap avoids both.
 */

/**
 * Per-cafe cap; the oldest entries are dropped past this.
 * One ID serializes to roughly 7 bytes, so 50k is about 350KB per cafe.
 */
const MAX_PER_CAFE = 50000;

const keyOf = (cafeId: string) => `read:${cafeId}`;

/** In-memory cache per cafe, so painting a list does not hit storage. */
const cache = new Map<string, Set<number>>();
const pendingWrites = new Set<string>();
let flushTimer: number | undefined;

export async function getReadArticles(cafeId: string): Promise<Set<number>> {
  const cached = cache.get(cafeId);
  if (cached) return cached;

  let ids: number[] = [];
  try {
    const key = keyOf(cafeId);
    const data = await chrome.storage.local.get(key);
    const raw = data?.[key];
    if (Array.isArray(raw)) ids = raw as number[];
  } catch (e) {
    console.error(e);
  }

  const set = new Set(ids);
  cache.set(cafeId, set);
  return set;
}

/** Records an article as read. No-op if already recorded. */
export async function markRead(
  cafeId: string,
  articleId: number,
): Promise<void> {
  if (!Number.isFinite(articleId)) return;

  const set = await getReadArticles(cafeId);
  if (set.has(articleId)) return;

  set.add(articleId);
  pendingWrites.add(cafeId);
  scheduleFlush();
}

/** Batches consecutive records into a single write. */
function scheduleFlush() {
  if (flushTimer !== undefined) clearTimeout(flushTimer);
  flushTimer = self.setTimeout(() => {
    flushTimer = undefined;
    void flush();
  }, 500);
}

async function flush(): Promise<void> {
  const targets = [...pendingWrites];
  pendingWrites.clear();

  for (const cafeId of targets) {
    const set = cache.get(cafeId);
    if (!set) continue;

    let ids = [...set];
    if (ids.length > MAX_PER_CAFE) {
      // Set preserves insertion order, so the front holds the oldest entries.
      ids = ids.slice(ids.length - MAX_PER_CAFE);
      cache.set(cafeId, new Set(ids));
    }

    try {
      await chrome.storage.local.set({ [keyOf(cafeId)]: ids });
    } catch (e) {
      console.error(e);
    }
  }
}

/** Clears one cafe's history, or all of them when cafeId is omitted. */
export async function clearReadArticles(cafeId?: string): Promise<void> {
  try {
    if (cafeId) {
      cache.delete(cafeId);
      await chrome.storage.local.remove(keyOf(cafeId));
      return;
    }
    cache.clear();
    const all = await chrome.storage.local.get(null);
    const keys = Object.keys(all).filter((k) => k.startsWith('read:'));
    if (keys.length > 0) await chrome.storage.local.remove(keys);
  } catch (e) {
    console.error(e);
  }
}

/** Total recorded count, shown in the popup. */
export async function countReadArticles(): Promise<number> {
  try {
    const all = await chrome.storage.local.get(null);
    return Object.entries(all)
      .filter(([k]) => k.startsWith('read:'))
      .reduce((sum, [, v]) => sum + (Array.isArray(v) ? v.length : 0), 0);
  } catch (e) {
    console.error(e);
    return 0;
  }
}
