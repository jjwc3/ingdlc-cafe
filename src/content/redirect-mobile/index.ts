/**
 * 모바일 → PC. (원본 js/redirect-mobile.js)
 *
 * m.cafe.naver.com 게시글 주소에 도달하면 PC 게시글 주소로 즉시 바꾼다.
 * document_start에 실행되므로 가능한 한 빨리 location.replace()에 도달해야 한다.
 *
 * 원본에는 `history.length > 1`이면 건너뛰는 가드가 있었으나 두지 않는다. 그 가드는
 * 새 탭에서만 동작하게 하려던 것인데, 기존 탭에서 주소를 붙여넣거나 외부 링크를 타고
 * 들어온 경우가 전부 걸러져 사실상 동작하지 않았다. 데스크톱에서 모바일 페이지는 언제
 * 도달하든 원치 않는 것이므로 항상 전환한다. 끄고 싶으면 팝업에서 끈다.
 *
 * `location.replace`를 쓰므로 모바일 주소가 히스토리에 남지 않는다. 뒤로 가면 모바일
 * 페이지를 거치지 않고 그 이전으로 간다(되돌아와 무한히 튕기지 않는다).
 *
 * 'cafeName' 형태는 네트워크·스토리지 접근 없이 즉시 변환된다.
 */
import { initialPathname, initialSearch } from '@/lib/early-check';
import {
  getMobileArticleInfo,
  getMobileArticleURL,
} from '@/lib/url-parser-mobile';
import { readConfig } from '@/modules/config';

async function main(): Promise<void> {
  // 주소 형태부터 확인해 해당 없는 페이지에서는 설정 조회조차 하지 않는다.
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

await main();
