/**
 * Naver Cafe URL classification.
 *
 * Two layouts coexist, and an article page nests three levels deep:
 *
 *   [A] Cafe home  cafe.naver.com/{name}
 *                   -> iframe#cafe_main -> /MyCafeIntro.nhn?clubid=X  (legacy)
 *   [B] Board      cafe.naver.com/f-e/cafes/{id}/menus/{menuId}       (Next.js SPA)
 *   [C] Article    [B] plus an iframe#cafe_main inside #cafe_content
 *                   -> /ca-fe/cafes/{id}/articles/{articleId} -> #app (React)
 *
 * So article links come in two shapes and both must be handled:
 *   legacy: /ArticleRead.nhn?clubid=X&articleid=Y
 *   new:    /f-e/cafes/X/articles/Y  or  /ca-fe/cafes/X/articles/Y
 */

export type CafeView =
  | { kind: 'home'; cafeName: string }
  | { kind: 'intro'; cafeId: string }
  | { kind: 'board'; cafeId: string; menuId: string }
  | { kind: 'article'; cafeId: string; articleId: string }
  | { kind: 'popular'; cafeId: string }
  | { kind: 'member'; cafeId: string }
  | { kind: 'unknown' };

const RE_FE_MENU = /^\/f-e\/cafes\/(\d+)\/menus\/(\d+)/;
const RE_FE_ARTICLE = /^\/f-e\/cafes\/(\d+)\/articles\/(\d+)/;
const RE_FE_POPULAR = /^\/f-e\/cafes\/(\d+)\/popular/;
const RE_FE_MEMBER = /^\/f-e\/cafes\/(\d+)\/members\//;
const RE_CAFE_ARTICLE = /^\/ca-fe\/cafes\/(\d+)\/articles\/(\d+)/;
const RE_CAFE_POPULAR = /^\/ca-fe\/cafes\/(\d+)\/popular/;
const RE_CAFE_MEMBER = /^\/ca-fe\/cafes\/(\d+)\/members\//;
const RE_CAFE_ANY = /^\/ca-fe\/cafes\/(\d+)\//;
const RE_HOME = /^\/(\w+)\/?$/;
/** Loose pattern for recovering a cafeId from any URL shape. */
const RE_ANY_CAFE_ID = /(?:[?&](?:search\.)?clubid=|\/cafes\/)(\d+)/;

/** Extracts an articleId: new path form first, then the legacy query. */
const RE_PATH_ARTICLE = /\/articles\/(\d+)/;
const RE_QUERY_ARTICLE = /[?&]articleid=(\d+)/i;

const RE_PATH_MENU = /\/menus\/(\d+)/;
const RE_QUERY_MENU = /[?&]search\.menuid=(\d+)/i;

export function getCafeView(loc: Location | URL): CafeView {
  const { pathname, search } = loc;
  const params = new URLSearchParams(search);

  const mMenu = RE_FE_MENU.exec(pathname);
  if (mMenu) {
    return { kind: 'board', cafeId: mMenu[1], menuId: mMenu[2] };
  }

  const mArticle =
    RE_FE_ARTICLE.exec(pathname) ?? RE_CAFE_ARTICLE.exec(pathname);
  if (mArticle) {
    return { kind: 'article', cafeId: mArticle[1], articleId: mArticle[2] };
  }

  const mPopular =
    RE_FE_POPULAR.exec(pathname) ?? RE_CAFE_POPULAR.exec(pathname);
  if (mPopular) {
    return { kind: 'popular', cafeId: mPopular[1] };
  }

  const mMember = RE_FE_MEMBER.exec(pathname) ?? RE_CAFE_MEMBER.exec(pathname);
  if (mMember) {
    return { kind: 'member', cafeId: mMember[1] };
  }

  // Inside the legacy iframe
  if (pathname === '/MyCafeIntro.nhn') {
    const cafeId = params.get('clubid');
    if (cafeId) return { kind: 'intro', cafeId };
  }
  if (pathname === '/ArticleList.nhn') {
    const cafeId = params.get('search.clubid');
    if (cafeId) {
      return {
        kind: 'board',
        cafeId,
        menuId: params.get('search.menuid') ?? '0',
      };
    }
  }
  if (/^(\/ca-fe)?\/ArticleRead\.nhn$/.test(pathname)) {
    const cafeId = params.get('clubid');
    const articleId = params.get('articleid');
    if (cafeId && articleId) return { kind: 'article', cafeId, articleId };
  }

  const mHome = RE_HOME.exec(pathname);
  if (mHome) {
    return { kind: 'home', cafeName: mHome[1] };
  }

  return { kind: 'unknown' };
}

/** cafeId from any URL shape; undefined on the home page, which has none. */
export function getCafeId(loc: Location | URL): string | undefined {
  const view = getCafeView(loc);
  if (view.kind !== 'home' && view.kind !== 'unknown') return view.cafeId;
  const m = RE_CAFE_ANY.exec(loc.pathname);
  return m?.[1];
}

/**
 * articleId from a list-row link.
 * Handles both `/f-e/.../articles/57` and `/ArticleRead.nhn?articleid=57`.
 */
export function parseArticleId(
  href: string | null | undefined,
): number | undefined {
  if (!href) return undefined;

  const path = RE_PATH_ARTICLE.exec(href);
  if (path) return Number(path[1]);

  const q = RE_QUERY_ARTICLE.exec(href);
  if (q) return Number(q[1]);

  return undefined;
}

/** menuId from a board (menu) link. */
export function parseMenuId(
  href: string | null | undefined,
): number | undefined {
  if (!href) return undefined;

  const path = RE_PATH_MENU.exec(href);
  if (path) return Number(path[1]);

  const q = RE_QUERY_MENU.exec(href);
  if (q) return Number(q[1]);

  return undefined;
}

/**
 * Finds the cafeId for the current document.
 *
 * Some URLs carry none — the cafe home (`cafe.naver.com/{name}`) for one. Fall
 * back to the iframe's URL or any link on the page (`search.clubid=`,
 * `/cafes/{id}/`). A legacy cafe's sidebar board list lives on such a page, so
 * without this fallback board harvesting is skipped entirely.
 */
export function resolveCafeId(): string | undefined {
  const fromUrl = getCafeId(location);
  if (fromUrl) return fromUrl;

  const iframe = document.querySelector<HTMLIFrameElement>(
    '#main-area iframe#cafe_main',
  );
  try {
    const inner = iframe?.contentWindow?.location;
    if (inner) {
      const fromIframe = getCafeId(inner);
      if (fromIframe) return fromIframe;
    }
  } catch {
    // Ignore cross-origin frames.
  }

  const links = document.querySelectorAll<HTMLAnchorElement>(
    'a[href*="clubid="], a[href*="/cafes/"]',
  );
  for (const a of links) {
    const href = a.getAttribute('href');
    const m = href ? RE_ANY_CAFE_ID.exec(href) : null;
    if (m) return m[1];
  }

  return undefined;
}
