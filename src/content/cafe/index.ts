/**
 * 읽은 글 표시 + 전체글보기 게시판 제외.
 *
 * 게시판·게시글은 Next.js SPA라 목록이 pushState와 함께 부분 재렌더된다. 전체 리로드가
 * 없으므로 폴링 대신 `#cafe_content` MutationObserver 하나로 모든 전환을 잡는다.
 * (목록↔게시글 이동, 뒤로가기, 게시판 전환, 페이지 넘김이 전부 여기로 들어온다)
 *
 * all_frames로 실행되므로 레거시 카페 홈의 iframe(/MyCafeIntro.nhn) 목록도 각 문서가
 * 스스로 처리한다. 그쪽은 #cafe_content가 없어 body를 관찰한다.
 */
import { getExcluded, mergeCafeBoards } from '@/modules/boardStore';
import {
  getCafeId,
  getCafeView,
  parseArticleId,
  parseMenuId,
  resolveCafeId,
} from '@/modules/cafePage';
import { readConfig, type AppConfig } from '@/modules/config';
import { getReadArticles, markRead } from '@/modules/readStore';

const READ_CLASS = 'IDC_read';
const HIDDEN_CLASS = 'IDC_hidden_board';
const BADGE_ID = 'IDC_except_badge';

/** 목록 행의 제목·댓글 링크. 목록형·앨범형·카드형을 모두 덮는다. */
const LINK_SELECTOR = 'a.article, a.tit';
/** 목록 행의 게시판 칸. 실측상 .board_name은 앵커 자체다. */
const BOARD_LINK_SELECTOR =
  'a.board_name[href*="/menus/"], .board_name a[href*="/menus/"]';

let config: AppConfig;
let excluded: number[] = [];
/** 배지의 "펼치기"를 누른 상태. 화면을 옮기면 풀린다. */
let revealed = false;

// --- 읽은 글 ---

async function recordCurrentArticle(): Promise<void> {
  if (config.read.enabled !== 1) return;

  const view = getCafeView(location);
  if (view.kind !== 'article') return;

  await markRead(view.cafeId, Number(view.articleId));
}

async function paintReadArticles(): Promise<void> {
  if (config.read.enabled !== 1) return;

  const cafeId = getCafeId(location);
  if (!cafeId) return;

  const read = await getReadArticles(cafeId);
  if (read.size === 0) return;

  for (const a of document.querySelectorAll<HTMLAnchorElement>(LINK_SELECTOR)) {
    if (a.classList.contains(READ_CLASS)) continue;

    const articleId = parseArticleId(a.getAttribute('href'));
    if (articleId !== undefined && read.has(articleId)) {
      a.classList.add(READ_CLASS);
    }
  }
}

// --- 게시판 카탈로그 수집 ---

/**
 * 사이드바 게시판 목록과 목록 행의 게시판 칸에서 menuId↔이름을 모은다.
 *
 * 사이드바 링크의 클래스는 `Sidebar_link__gAh1M` 같은 CSS-module 해시라 배포마다 바뀐다.
 * 대신 href 형태와 "표의 행 안에 있지 않다"는 조건으로 골라낸다.
 */
async function harvestBoards(cafeId: string): Promise<void> {
  const boards: Record<string, string> = {};

  // 리뉴얼(/menus/{id})과 레거시(search.menuid={id}) 두 형식을 모두 받는다.
  for (const a of document.querySelectorAll<HTMLAnchorElement>(
    'a[href*="/menus/"], a[href*="search.menuid="]',
  )) {
    const menuId = parseMenuId(a.getAttribute('href'));
    if (menuId === undefined || menuId === 0) continue; // 0은 전체글보기

    const name = a.textContent?.trim();
    if (!name || name.length > 40) continue;

    boards[String(menuId)] = name;
  }

  // 카페 이름. 카페 홈에서는 주소 자체가 이름이고, 그 외 화면에서는 홈 링크를 찾는다.
  // (첫 cafe.naver.com 링크는 게시글일 수 있으므로 홈 형태에 맞는 것만 받는다)
  const view = getCafeView(location);
  let cafeName = view.kind === 'home' ? view.cafeName : undefined;

  if (!cafeName) {
    for (const a of document.querySelectorAll<HTMLAnchorElement>(
      'a[href*="cafe.naver.com/"]',
    )) {
      const m = a
        .getAttribute('href')
        ?.match(/^https:\/\/cafe\.naver\.com\/(\w+)\/?$/);
      if (m) {
        cafeName = m[1];
        break;
      }
    }
  }

  if (Object.keys(boards).length === 0 && !cafeName) return;
  await mergeCafeBoards(cafeId, { cafeName, boards });
}

// --- 게시판 제외 ---

/** 제외 대상 행을 숨기고 숨긴 개수를 돌려준다. */
function applyExclusion(): number {
  let hidden = 0;

  for (const a of document.querySelectorAll<HTMLAnchorElement>(
    BOARD_LINK_SELECTOR,
  )) {
    const row = a.closest('tr') ?? a.closest('li');
    if (!row) continue;

    const menuId = parseMenuId(a.getAttribute('href'));
    const shouldHide = menuId !== undefined && excluded.includes(menuId);

    row.classList.toggle(HIDDEN_CLASS, shouldHide && !revealed);
    if (shouldHide) hidden += 1;
  }

  renderBadge(hidden);
  return hidden;
}

/**
 * "N개 숨김 · 펼치기" 배지.
 *
 * 서버가 한 페이지 분량(15개)을 보낸 뒤 클라이언트에서 숨기는 방식이라, 제외한 게시판이
 * 많으면 화면에 남는 글이 눈에 띄게 줄어든다. 몇 개가 숨겨졌는지 알려 준다.
 */
function renderBadge(hidden: number): void {
  const existing = document.getElementById(BADGE_ID);

  if (hidden === 0) {
    existing?.remove();
    return;
  }

  const board = document.querySelector('.article-board');
  if (!board?.parentElement) {
    existing?.remove();
    return;
  }

  const badge = existing ?? document.createElement('div');
  if (!existing) {
    badge.id = BADGE_ID;
    board.parentElement.insertBefore(badge, board);
  }

  const label = revealed ? '접기' : '펼치기';
  if (
    badge.dataset.hidden === String(hidden) &&
    badge.dataset.label === label
  ) {
    return; // 내용이 같으면 DOM을 건드리지 않는다(관찰자 되먹임 방지)
  }
  badge.dataset.hidden = String(hidden);
  badge.dataset.label = label;

  badge.textContent = '';

  const text = document.createElement('span');
  text.textContent = `제외한 게시판의 글 ${hidden}개 숨김`;

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.textContent = label;
  toggle.addEventListener('click', () => {
    revealed = !revealed;
    applyExclusion();
  });

  badge.append(text, toggle);
}

// --- 실행 ---

let pending: number | undefined;

function schedule(): void {
  if (pending !== undefined) clearTimeout(pending);
  pending = window.setTimeout(() => {
    pending = undefined;
    void run();
  }, 80);
}

async function run(): Promise<void> {
  try {
    await recordCurrentArticle();
    await paintReadArticles();

    const cafeId = resolveCafeId();
    if (!cafeId) return;

    await harvestBoards(cafeId);
    applyExclusion();
  } catch (e) {
    console.error(e);
  }
}

async function init(): Promise<void> {
  config = await readConfig();

  const cafeId = resolveCafeId();
  if (cafeId) excluded = await getExcluded(cafeId);

  const target = document.querySelector('#cafe_content') ?? document.body;
  if (target) {
    new MutationObserver(schedule).observe(target, {
      childList: true,
      subtree: true,
    });
  }

  // #cafe_content 자체가 나중에 생기는 경우(SPA 초기 렌더)를 대비해 body도 한 번 본다.
  if (target !== document.body && document.body) {
    new MutationObserver(schedule).observe(document.body, { childList: true });
  }

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'local') return;

    if (changes.config) {
      config = changes.config.newValue as AppConfig;
    }

    const id = resolveCafeId();
    if (id && changes[`except:${id}`]) {
      const next = changes[`except:${id}`].newValue;
      excluded = Array.isArray(next) ? (next as number[]) : [];
      revealed = false;
    }

    schedule();
  });

  await run();
}

await init();
