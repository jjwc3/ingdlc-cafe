/**
 * Cafe name <-> cafe ID cache. (from js/util/storage.js)
 *
 * Stored in chrome.storage.session, so it is shared across tabs for the
 * browser session. Content scripts can only reach it because the service
 * worker opens TRUSTED_AND_UNTRUSTED_CONTEXTS (see src/background.ts).
 */

interface CafeInfo {
  cafeId: number;
  cafeName: string;
  cafeTitle: string;
}

interface CafeGateInfoView {
  cafeId: number;
  cafeUrl: string;
  cafeName: string;
}

export class SessionCafeInfo {
  cafeInfo: CafeInfo[];

  constructor(items?: { cafeInfo?: CafeInfo[] }) {
    this.cafeInfo = items?.cafeInfo ?? [];
  }

  findCafeId(cafeName: string): number | undefined {
    return this.cafeInfo.find((item) => item.cafeName === cafeName)?.cafeId;
  }

  findCafeName(cafeId: string | number): string | undefined {
    const id = typeof cafeId === 'number' ? cafeId : Number.parseInt(cafeId);
    return this.cafeInfo.find((item) => item.cafeId === id)?.cafeName;
  }

  async requestCafeInfo(query: string): Promise<void> {
    try {
      const url =
        'https://apis.naver.com/cafe-web/cafe2/CafeGateInfo.json?' + query;
      const res = await fetch(url);
      const json = await res.json();
      const info: CafeGateInfoView | undefined =
        json?.message?.result?.cafeInfoView;
      if (!info) {
        return;
      }
      const { cafeId, cafeUrl: cafeName, cafeName: cafeTitle } = info;
      this.cafeInfo.push({ cafeId, cafeName, cafeTitle });
      await chrome.storage.session.set({ cafeInfo: this.cafeInfo });
    } catch (e) {
      console.error(e);
    }
  }

  private static instance: Promise<SessionCafeInfo> | null = null;

  /**
   * Dedupes in-flight lookups by query.
   *
   * The original used one static `_request` slot but cleared it via
   * `this._request = null` in `finally`, which set an instance property — the
   * static slot was never freed, so a second cafe lookup on the same page
   * always failed. A per-query Map fixes it.
   */
  private static readonly requests = new Map<string, Promise<void>>();

  static async get(): Promise<SessionCafeInfo> {
    this.instance ??= chrome.storage.session
      .get('cafeInfo')
      .then((items) => new SessionCafeInfo(items as { cafeInfo?: CafeInfo[] }));
    return this.instance;
  }

  private static async request(query: string): Promise<SessionCafeInfo> {
    const instance = await this.get();
    let pending = this.requests.get(query);
    if (!pending) {
      pending = instance.requestCafeInfo(query).finally(() => {
        SessionCafeInfo.requests.delete(query);
      });
      this.requests.set(query, pending);
    }
    await pending;
    return instance;
  }

  static async getCafeId(cafeName: string): Promise<number | undefined> {
    const cached = (await this.get()).findCafeId(cafeName);
    if (cached) {
      return cached;
    }
    return (await this.request('cluburl=' + cafeName)).findCafeId(cafeName);
  }

  static async getCafeName(
    cafeId: string | number,
  ): Promise<string | undefined> {
    const cached = (await this.get()).findCafeName(cafeId);
    if (cached) {
      return cached;
    }
    return (await this.request('cafeId=' + cafeId)).findCafeName(cafeId);
  }
}
