/**
 * 게시판 카탈로그와 제외 목록.
 *
 * 두 가지를 각각 별도 storage 키로 관리한다.
 *   `boards:{cafeId}`  카페 이름 + menuId↔게시판 이름 (콘텐츠 스크립트가 수집, 표시 전용)
 *   `except:{cafeId}`  제외할 menuId 목록 (제외 판정에 쓰는 유일한 키)
 *
 * 이름은 팝업에 보여 주기 위해서만 쓴다. 판정은 언제나 menuId로 한다. 게시판 이름이
 * 바뀌어도 제외 설정이 풀리지 않는다.
 *
 * 설정(config)과 분리한 이유: 목록 행의 "제외" 버튼으로 콘텐츠 스크립트가 제외 목록을
 * 직접 고치는데, 이를 config에 두면 config 전체를 읽고 다시 쓰는 사이에 팝업이 동시에
 * 바꾼 다른 설정을 덮어쓸 수 있다.
 */

export interface CafeBoards {
  /** 카페 주소에 쓰이는 이름. 팝업에서 카페를 구분하는 용도. */
  cafeName?: string;
  /** menuId → 게시판 이름 */
  boards: Record<string, string>;
}

export interface CafeEntry extends CafeBoards {
  cafeId: string;
  excluded: number[];
}

const catalogKey = (cafeId: string) => `boards:${cafeId}`;
const exceptKey = (cafeId: string) => `except:${cafeId}`;

export async function getCafeBoards(cafeId: string): Promise<CafeBoards> {
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

/** 수집한 내용을 병합한다. 실제로 달라진 게 없으면 쓰지 않는다. */
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

/** 팝업용. 지금까지 방문해 수집된 카페를 전부 돌려준다. */
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

/** 카페 하나의 수집·제외 기록을 지운다. cafeId를 생략하면 전체. */
export async function clearBoards(cafeId?: string): Promise<void> {
  try {
    if (cafeId) {
      await chrome.storage.local.remove([
        catalogKey(cafeId),
        exceptKey(cafeId),
      ]);
      return;
    }
    const all = await chrome.storage.local.get(null);
    const keys = Object.keys(all).filter(
      (k) => k.startsWith('boards:') || k.startsWith('except:'),
    );
    if (keys.length > 0) await chrome.storage.local.remove(keys);
  } catch (e) {
    console.error(e);
  }
}
