/**
 * Parser for m.cafe.naver.com article URLs. (from js/url-parser-mobile.js)
 *
 * The original's TYPE_DEFAULT and TYPE_CAFE_NAME convert identically, so they
 * are merged into 'cafeName'.
 */
import { SessionCafeInfo } from './storage';

export type MobileArticleInfo =
  | { type: 'cafeName'; cafeName: string; articleId: string }
  | { type: 'cafeId'; cafeId: string; articleId: string };

// Without the /ca-fe prefix there should be no trailing slash either, but that
// is harmless to allow.
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
 * Converts to the PC article URL.
 * 'cafeName' resolves instantly; only 'cafeId' needs a cafe-name lookup.
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
