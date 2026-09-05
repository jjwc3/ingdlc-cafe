/**
 * Board catalog and exclusion list.
 *
 * Two separate storage keys:
 *   `boards:{cafeId}`  cafe name + menuId -> board name (harvested, display only)
 *   `except:{cafeId}`  excluded menuIds (the only key exclusion is judged by)
 *
 * Names exist purely to label the popup. Matching always uses menuId, so
 * renaming a board never drops its exclusion.
 *
 * Kept out of `config` so writes here cannot clobber unrelated settings that
 * the popup may be saving at the same time.
 */

export interface CafeBoards {
  /** Name used in the cafe URL; distinguishes cafes in the popup. */
  cafeName?: string;
  /** menuId -> board name */
  boards: Record<string, string>;
}

export interface CafeEntry extends CafeBoards {
  cafeId: string;
  excluded: number[];
}

const catalogKey = (cafeId: string) => `boards:${cafeId}`;
const exceptKey = (cafeId: string) => `except:${cafeId}`;

async function getCafeBoards(cafeId: string): Promise<CafeBoards> {
  try {
    const key = catalogKey(cafeId);
    const data = await chrome.storage.local.get(key);
    const saved = data?.[key] as CafeBoards | undefined;
    return { cafeName: saved?.cafeName, boards: saved?.boards ?? {} };
  } catch (e) {
    console.error(e);
    return { boards: {} };
  }
}

/** Merges harvested data. Skips the write when nothing actually changed. */
export async function mergeCafeBoards(
  cafeId: string,
  patch: CafeBoards,
): Promise<void> {
  try {
    const current = await getCafeBoards(cafeId);
    const boards = { ...current.boards, ...patch.boards };
    const cafeName = patch.cafeName ?? current.cafeName;

    const unchanged =
      cafeName === current.cafeName &&
      JSON.stringify(boards) === JSON.stringify(current.boards);
    if (unchanged) return;

    await chrome.storage.local.set({
      [catalogKey(cafeId)]: { cafeName, boards },
    });
  } catch (e) {
    console.error(e);
  }
}

export async function getExcluded(cafeId: string): Promise<number[]> {
  try {
    const key = exceptKey(cafeId);
    const data = await chrome.storage.local.get(key);
    const saved = data?.[key];
    return Array.isArray(saved) ? (saved as number[]) : [];
  } catch (e) {
    console.error(e);
    return [];
  }
}

export async function setExcluded(
  cafeId: string,
  menuIds: number[],
): Promise<void> {
  try {
    const key = exceptKey(cafeId);
    if (menuIds.length === 0) {
      await chrome.storage.local.remove(key);
      return;
    }
    await chrome.storage.local.set({
      [key]: [...new Set(menuIds)].sort((a, b) => a - b),
    });
  } catch (e) {
    console.error(e);
  }
}

/** For the popup: every cafe harvested so far. */
export async function listCafes(): Promise<CafeEntry[]> {
  try {
    const all = await chrome.storage.local.get(null);
    const entries: CafeEntry[] = [];

    for (const [key, value] of Object.entries(all)) {
      if (!key.startsWith('boards:')) continue;
      const cafeId = key.slice('boards:'.length);
      const catalog = value as CafeBoards;
      const excluded = all[exceptKey(cafeId)];

      entries.push({
        cafeId,
        cafeName: catalog?.cafeName,
        boards: catalog?.boards ?? {},
        excluded: Array.isArray(excluded) ? (excluded as number[]) : [],
      });
    }

    return entries.sort((a, b) =>
      (a.cafeName ?? a.cafeId).localeCompare(b.cafeName ?? b.cafeId),
    );
  } catch (e) {
    console.error(e);
    return [];
  }
}
