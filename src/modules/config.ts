export interface AppConfig {
  /** 이미지 가리기 (몰컴모드) */
  blur: {
    /** 0=OFF, 1=이미지만, 2=이미지+배경이미지 */
    enabled: 0 | 1 | 2;
    /** 마우스를 올리면 원본 표시 */
    hoverReveal: 0 | 1;
  };
  /** 읽은 글 표시 */
  read: {
    enabled: 0 | 1;
  };
  /** 방송 중 ON AIR 버튼 */
  liveAlert: {
    enabled: 0 | 1;
  };
  /** 새 탭 리다이렉트 */
  redirect: {
    /** 모바일 주소를 PC로 전환 */
    mobile: 0 | 1;
  };
}

export const initialConfig: AppConfig = {
  blur: {
    enabled: 0,
    hoverReveal: 1,
  },
  read: {
    enabled: 1,
  },
  liveAlert: {
    enabled: 1,
  },
  redirect: {
    mobile: 0,
  },
};

/**
 * 콘텐츠 스크립트용 1회성 읽기.
 *
 * 이 모듈은 svelte를 import 하지 않는다. 리다이렉트 스크립트는 document_start에 실행되므로
 * Svelte 런타임(약 21KB)이 딸려 들어오면 그만큼 늦어진다.
 */
export const readConfig = async (): Promise<AppConfig> => {
  try {
    const data = await chrome.storage.local.get('config');
    const saved = (data?.config ?? {}) as Partial<AppConfig>;
    return { ...initialConfig, ...saved };
  } catch (e) {
    console.error(e);
    return { ...initialConfig };
  }
};
