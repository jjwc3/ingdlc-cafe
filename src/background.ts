/** Service worker. */

// Let content scripts reach storage.session (the cafe name/ID cache).
// Without this, SessionCafeInfo fails everywhere.
chrome.storage.session
    .setAccessLevel( { accessLevel: 'TRUSTED_AND_UNTRUSTED_CONTEXTS' } )
    .catch( ( e ) => console.error( e ) );

// Live-stream check for the ON AIR button.
//
// A content script's fetch obeys the page origin's CORS, but the service
// worker's fetch is allowed by host_permissions. Polling here also means one
// shared 30s cache instead of one poll per tab.
const STATION_API = 'https://chapi.sooplive.co.kr/api/nanajam/station';
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
        return true; // async response
      }
      return undefined;
    },
);

chrome.runtime.onInstalled.addListener( ( details ) => {
  if ( details.reason === chrome.runtime.OnInstalledReason.INSTALL ) {
    // noinspection JSIgnoredPromiseFromCall
    chrome.tabs.create( {
      url: "https://github.com/jjwc3/ingdlc-cafe/blob/master/new.md"
    } )
  }
} )