/**
 * Read-article marking and board exclusion in the all-articles list.
 *
 * Boards and articles are a Next.js SPA: the list re-renders in place alongside
 * pushState, with no full reload. A single MutationObserver on `#cafe_content`
 * catches every transition (list <-> article, back, board switch, paging), so
 * no polling is needed.
 *
 * Runs in every frame, so the legacy cafe home's iframe (/MyCafeIntro.nhn)
 * handles its own list. That document has no #cafe_content, so body is watched.
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

/** Title links in list rows; covers list, album and card layouts. */
const LINK_SELECTOR = 'a.article, a.tit';
/** Board cell in a list row. In practice .board_name is the anchor itself. */
const BOARD_LINK_SELECTOR =
  'a.board_name[href*="/menus/"], .board_name a[href*="/menus/"]';

let config: AppConfig;
let excluded: number[] = [];
/** Set while the badge's reveal toggle is on; resets on navigation. */
let revealed = false;

// --- Read articles ---

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

// --- Board catalog harvesting ---

/**
 * Collects menuId -> name from the sidebar and from list-row board cells.
 *
 * Sidebar link classes are CSS-module hashes (`Sidebar_link__gAh1M`) that
 * change every deploy, so selection relies on the href shape instead.
 */
async function harvestBoards(cafeId: string): Promise<void> {
  const boards: Record<string, string> = {};

  // Accepts both the new (/menus/{id}) and legacy (search.menuid={id}) forms.
  for (const a of document.querySelectorAll<HTMLAnchorElement>(
    'a[href*="/menus/"], a[href*="search.menuid="]',
  )) {
    const menuId = parseMenuId(a.getAttribute('href'));
    if (menuId === undefined || menuId === 0) continue; // 0 is the all-articles view

    const name = a.textContent?.trim();
    if (!name || name.length > 40) continue;

    boards[String(menuId)] = name;
  }

  // Cafe name: the home URL is the name itself; elsewhere look for a home link.
  // The first cafe.naver.com link may be an article, so match the home shape.
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

// --- Board exclusion ---

/** Hides excluded rows and returns how many were hidden. */
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
 * The "N hidden / reveal" badge.
 *
 * The server sends a full page (15 rows) and hiding happens client-side, so
 * excluding several boards visibly thins the list. The badge says how many
 * rows went away.
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
    return; // Leave the DOM alone when unchanged, to avoid observer feedback
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

// --- Entry point ---

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

  // #cafe_content may appear later during the SPA's first render; watch body too.
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
