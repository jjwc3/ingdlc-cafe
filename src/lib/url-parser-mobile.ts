/**
 * m.cafe.naver.com 게시글 주소 파서. (원본 js/util/url-parser-mobile.js)
 *
 * 원본의 TYPE_DEFAULT와 TYPE_CAFE_NAME은 변환 로직이 완전히 동일해서 'cafeName' 하나로
 * 합쳤다.
 */
import { SessionCafeInfo } from './storage';

export type MobileArticleInfo =
  | { type: 'cafeName'; cafeName: string; articleId: string }
  | { type: 'cafeId'; cafeId: string; articleId: string };

// 앞에 /ca-fe가 없으면 뒤에 /도 없어야 하지만 큰 문제는 아님
const RE_DEFAULT = /^(\/ca-fe)?\/(?<cafeName>\w+)\/(?<articleId>\d+)\/?$/;
const RE_CAFE_ID =
  /^\/ca-fe\/web\/cafes\/(?<cafeId>\d+)\/articles\/(?<articleId>\d+)\/?$/;
const RE_CAFE_NAME =
  /^\/ca-fe\/web\/cafes\/(?<cafeName>\w+)\/articles\/(?<articleId>\d+)\/?$/;

export function getMobileArticleInfo(
  pathname: string,
  search: string,
): MobileArticleInfo | undefined {
  {
    const matches = RE_DEFAULT.exec(pathname);
    if (matches?.groups) {
      const { cafeName, articleId } = matches.groups;
      return { type: 'cafeName', cafeName, articleId };
    }
  }

  const searchParams = new URLSearchParams(search);
  const useCafeId = searchParams.get('useCafeId')?.toLowerCase();

  if (!useCafeId || useCafeId === 'true') {
    const matches = RE_CAFE_ID.exec(pathname);
    if (matches?.groups) {
      const { cafeId, articleId } = matches.groups;
      return { type: 'cafeId', cafeId, articleId };
    }
  }

  if (useCafeId === 'false') {
    const matches = RE_CAFE_NAME.exec(pathname);
    if (matches?.groups) {
      const { cafeName, articleId } = matches.groups;
      return { type: 'cafeName', cafeName, articleId };
    }
  }

  return undefined;
}

/**
 * PC 게시글 주소로 변환한다.
 *
 * 'cafeName' 형태는 네트워크·스토리지 접근 없이 즉시 계산된다.
 * 'cafeId' 형태만 카페 이름 조회가 필요하다.
 */
export async function getMobileArticleURL(
  info: MobileArticleInfo | undefined,
): Promise<string | undefined> {
  if (!info) {
    return undefined;
  }
  if (info.type === 'cafeName') {
    return `https://cafe.naver.com/${info.cafeName}/${info.articleId}`;
  }
  const cafeName = await SessionCafeInfo.getCafeName(info.cafeId);
  if (!cafeName) {
    return undefined;
  }
  return `https://cafe.naver.com/${cafeName}/${info.articleId}`;
}
