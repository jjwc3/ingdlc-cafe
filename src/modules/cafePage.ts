/**
 * 네이버 카페 주소 판별.
 *
 * 2026년 현재 카페는 레이아웃이 두 가지 공존하고, 게시글은 3중 중첩이다.
 *
 *   [A] 카페 홈   cafe.naver.com/{name}
 *                  └ iframe#cafe_main → /MyCafeIntro.nhn?clubid=X   (레거시 마크업)
 *   [B] 게시판    cafe.naver.com/f-e/cafes/{id}/menus/{menuId}      (Next.js SPA)
 *   [C] 게시글    [B] + #cafe_content 안에 iframe#cafe_main
 *                  → /ca-fe/cafes/{id}/articles/{articleId}
 *                     └ #app (React)
 *
 * 그 결과 게시글 링크 형식이 두 가지다. 둘 다 처리해야 한다.
 *   - 레거시: /ArticleRead.nhn?clubid=X&articleid=Y
 *   - 신규:   /f-e/cafes/X/articles/Y  또는  /ca-fe/cafes/X/articles/Y
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
/** 주소 어디에서든 cafeId를 회수하기 위한 느슨한 패턴. */
const RE_ANY_CAFE_ID = /(?:[?&](?:search\.)?clubid=|\/cafes\/)(\d+)/;

/** 경로 어디에서든 articleId를 뽑는다. 신규 경로 형식 우선, 없으면 레거시 쿼리. */
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

  // 레거시 iframe 내부
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

/** 어떤 형태의 주소에서든 cafeId를 뽑는다. 홈(cafeName만 있는 형태)에서는 undefined. */
export function getCafeId(loc: Location | URL): string | undefined {
  const view = getCafeView(loc);
  if (view.kind !== 'home' && view.kind !== 'unknown') return view.cafeId;
  const m = RE_CAFE_ANY.exec(loc.pathname);
  return m?.[1];
}

/**
 * 목록 행의 링크에서 articleId를 뽑는다.
 * `/f-e/.../articles/57` 과 `/ArticleRead.nhn?articleid=57` 두 형식을 모두 다룬다.
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

/** 게시판(메뉴) 링크에서 menuId를 뽑는다. */
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
 * 현재 문서에서 cafeId를 찾는다.
 *
 * 카페 홈(`cafe.naver.com/{name}`)처럼 주소에 cafeId가 없는 경우가 있다. 그때는
 * iframe 내부 주소나 페이지 안의 링크(`search.clubid=`, `/cafes/{id}/`)에서 회수한다.
 * 레거시 카페의 사이드바 게시판 목록이 이 경우에 해당해, 회수하지 않으면 수집이 통째로
 * 건너뛰어진다.
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
    // 교차 출처면 무시한다.
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

/** 최상위 문서가 카페 전체 레이아웃이 아니라 게시글만 단독 로딩된 페이지인지. */
export function isStandalonePage(): boolean {
  return (
    location.pathname.startsWith('/ca-fe/cafes/') &&
    !document.querySelector('#main-area iframe#cafe_main')
  );
}
