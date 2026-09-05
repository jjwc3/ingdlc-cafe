/**
 * 콘텐츠 스크립트가 document_start에 주입된 시점의 URL 정보.
 *
 * 이후 SPA 라우팅이나 리다이렉트로 location이 바뀌어도 최초 진입 주소가 필요한 곳이 있어
 * 모듈 평가 시점에 한 번 캡처한다. (원본 js/early-check.js)
 */
export const initialHref = location.href;
export const initialPathname = location.pathname;
export const initialSearch = location.search;

/** 최상위 문서가 리뉴얼 카페(/f-e/) 주소인지 여부. */
export const isNewCafe = initialPathname.startsWith('/f-e/');
