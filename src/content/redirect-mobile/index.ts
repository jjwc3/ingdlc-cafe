/**
 * Mobile to PC. (from js/redirect-mobile.js)
 *
 * Rewrites an m.cafe.naver.com article URL to its PC counterpart. Runs at
 * document_start, so it should reach location.replace() as early as possible.
 *
 * The original skipped when `history.length > 1` to act on new tabs only, but
 * that filtered out pasted URLs and external links — nearly every real case.
 * On desktop the mobile page is never wanted, so always convert. Use the popup
 * switch to turn it off.
 *
 * `location.replace` keeps the mobile URL out of history, so going back skips
 * it instead of bouncing forward again.
 *
 * The 'cafeName' form converts with no network or storage access.
 */
import { initialPathname, initialSearch } from '@/lib/early-check';
import {
  getMobileArticleInfo,
  getMobileArticleURL,
} from '@/lib/url-parser-mobile';
import { readConfig } from '@/modules/config';

async function main(): Promise<void> {
  // Check the URL shape first so unrelated pages never touch storage.
  const info = getMobileArticleInfo(initialPathname, initialSearch);
  if (!info) {
    return;
  }

  const config = await readConfig();
  if (config.redirect.mobile !== 1) {
    return;
  }

  const url = await getMobileArticleURL(info);
  if (!url) {
    return;
  }

  if (import.meta.env.DEV) {
    console.debug(
      '[INGDLC] redirect-mobile',
      Math.round(performance.now()),
      'ms',
      info.type,
    );
  }

  location.replace(url);
}

void main();
