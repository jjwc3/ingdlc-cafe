/**
 * 읽은 글 기록.
 *
 * chrome.storage.local에 카페별 키(`read:{cafeId}`)로 나눠 저장한다.
 *
 * 원본(INGDLC for SOOP)은 모든 설정과 모든 카페의 읽은 글을 storage.sync의 `config`
 * 단일 키에 넣었다. sync의 QUOTA_BYTES_PER_ITEM은 8,192바이트라 글이 1,000개쯤 쌓이면
 * 한도를 넘고 그 시점부터 설정 저장 자체가 실패한다. 또 매 기록마다 config 전체를 다시
 * 써서 분당 쓰기 한도(120회)에도 걸린다. local(기본 10MB) + 카페별 분리 + 상한으로 해소했다.
 */

/**
 * 카페당 보관할 최대 개수. 넘으면 오래된 것부터 버린다.
 *
 * articleId 하나가 직렬화 시 약 7바이트라 5만 개면 카페당 350KB 남짓이다.
 * chrome.storage.local은 10MB이므로 카페 여러 곳을 다녀도 여유가 있다.
 */
const MAX_PER_CAFE = 50000;

const keyOf = (cafeId: string) => `read:${cafeId}`;

/** cafeId별 메모리 캐시. 목록 렌더마다 storage를 때리지 않기 위함. */
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

/** 읽음으로 기록한다. 이미 있으면 아무것도 하지 않는다. */
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

/** 연속 기록을 모아서 한 번에 쓴다. */
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
      // Set은 삽입 순서를 유지하므로 앞쪽이 오래된 기록이다.
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

/** 특정 카페의 기록을 지운다. cafeId를 생략하면 전체. */
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

/** 저장된 총 개수. 팝업에서 안내용으로 쓴다. */
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
