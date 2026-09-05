export interface AppConfig {
  /** Image hiding (stealth mode) */
  blur: {
    /** 0=off, 1=images only, 2=images + background images */
    enabled: 0 | 1 | 2;
    /** Reveal the original on hover */
    hoverReveal: 0 | 1;
  };
  /** Mark articles already read */
  read: {
    enabled: 0 | 1;
  };
  /** ON AIR button while streaming */
  liveAlert: {
    enabled: 0 | 1;
  };
  /** URL redirects */
  redirect: {
    /** Rewrite mobile URLs to PC */
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
 * One-shot read for content scripts.
 *
 * This module deliberately avoids importing svelte: the redirect script runs at
 * document_start, and pulling in the ~21KB Svelte runtime would delay it.
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
