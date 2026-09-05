/**
 * 서비스 워커.
 */

// 콘텐츠 스크립트가 storage.session(카페 이름↔ID 캐시)에 접근할 수 있게 연다.
// 이 호출이 없으면 SessionCafeInfo가 전부 실패한다.
try {
  await chrome.storage.session.setAccessLevel( { accessLevel: 'TRUSTED_AND_UNTRUSTED_CONTEXTS' } );
} catch ( e ) {
  console.error( e );
}

// --- 방송 여부 확인 (ON AIR 버튼) ---
//
// 콘텐츠 스크립트에서 직접 fetch하면 페이지 오리진(cafe.naver.com)의 CORS를 따르지만,
// 서비스 워커의 fetch는 host_permissions로 교차 출처가 허용된다. 또 탭마다 폴링하는 대신
// 한 번만 조회해 캐시를 공유한다.
const STATION_API = 'https://chapi.sooplive.com/api/nanajam/station';
const LIVE_TTL = 30_000;

let liveCache: { onAir: boolean; at: number } | undefined;

async function checkLive(): Promise<boolean> {
  if ( liveCache && Date.now() - liveCache.at < LIVE_TTL ) {
    return liveCache.onAir;
  }
  try {
    const res = await fetch( STATION_API );
    const json = await res.json();
    const onAir = json?.broad != null;
    liveCache = { onAir, at: Date.now() };
    return onAir;
  } catch ( e ) {
    console.error( e );
    return liveCache?.onAir ?? false;
  }
}

chrome.runtime.onMessage.addListener(
    ( message: { action?: string }, _sender, sendResponse ) => {
      if ( message?.action === 'INGDLC_LIVE_CHECK' ) {
        checkLive().then( ( onAir ) => sendResponse( { onAir } ) );
        return true; // 비동기 응답
      }

      return undefined;
    },
);
