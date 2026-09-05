/**
 * 카페 이름 ↔ 카페 ID 변환 캐시.
 *
 * chrome.storage.session에 저장하므로 브라우저 세션 동안 탭 간에 공유된다.
 * 콘텐츠 스크립트에서 접근하려면 서비스 워커가 setAccessLevel로
 * TRUSTED_AND_UNTRUSTED_CONTEXTS를 열어 줘야 한다(src/background.ts 참조).
 */

export interface CafeInfo {
  cafeId: number;
  cafeName: string;
  cafeTitle: string;
}

interface CafeGateInfoView {
  cafeId: number;
  cafeUrl: string;
  cafeName: string;
}

export class SessionCafeInfo {
  cafeInfo: CafeInfo[];

  constructor( items?: { cafeInfo?: CafeInfo[] } ) {
    this.cafeInfo = items?.cafeInfo ?? [];
  }

  findCafeId( cafeName: string ): number | undefined {
    return this.cafeInfo.find( ( item ) => item.cafeName === cafeName )?.cafeId;
  }

  findCafeName( cafeId: string | number ): string | undefined {
    const id = typeof cafeId === 'number' ? cafeId : Number.parseInt( cafeId );
    return this.cafeInfo.find( ( item ) => item.cafeId === id )?.cafeName;
  }

  async requestCafeInfo( query: string ): Promise<void> {
    try {
      const url =
          'https://apis.naver.com/cafe-web/cafe2/CafeGateInfo.json?' + query;
      const res = await fetch( url );
      const json = await res.json();
      const info: CafeGateInfoView | undefined =
          json?.message?.result?.cafeInfoView;
      if ( !info ) {
        return;
      }
      const {
        cafeId,
        cafeUrl: cafeName,
        cafeName: cafeTitle,
      } = info;
      this.cafeInfo.push( { cafeId, cafeName, cafeTitle } );
      await chrome.storage.session.set( { cafeInfo: this.cafeInfo } );
    } catch ( e ) {
      console.error( e );
    }
  }

  private static instance: Promise<SessionCafeInfo> | null = null;

  /**
   * 진행 중인 조회를 query별로 dedupe 한다.
   *
   * 원본은 단일 static _request 슬롯을 쓰면서 finally에서 `this._request = null`로
   * 인스턴스 프로퍼티를 지웠기 때문에 static 슬롯이 영원히 비워지지 않았다. 그 결과 한 페이지
   * 안에서 두 번째 카페 조회가 항상 실패했다. query별 Map으로 바꿔 해소한다.
   */
  private static readonly requests = new Map<string, Promise<void>>();

  static async get(): Promise<SessionCafeInfo> {
    this.instance ??= chrome.storage.session
        .get( 'cafeInfo' )
        .then(
            ( items ) => new SessionCafeInfo( items as { cafeInfo?: CafeInfo[] } ),
        );
    return this.instance;
  }

  private static async request( query: string ): Promise<SessionCafeInfo> {
    const instance = await this.get();
    let pending = this.requests.get( query );
    if ( !pending ) {
      pending = instance.requestCafeInfo( query ).finally( () => {
        SessionCafeInfo.requests.delete( query );
      } );
      this.requests.set( query, pending );
    }
    await pending;
    return instance;
  }

  static async getCafeId( cafeName: string ): Promise<number | undefined> {
    const cached = ( await this.get() ).findCafeId( cafeName );
    if ( cached ) {
      return cached;
    }
    return ( await this.request( 'cluburl=' + cafeName ) ).findCafeId( cafeName );
  }

  static async getCafeName(
      cafeId: string | number,
  ): Promise<string | undefined> {
    const cached = ( await this.get() ).findCafeName( cafeId );
    if ( cached ) {
      return cached;
    }
    return ( await this.request( 'cafeId=' + cafeId ) ).findCafeName( cafeId );
  }
}
