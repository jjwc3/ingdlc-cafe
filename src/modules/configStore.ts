import { writable } from 'svelte/store';

import { initialConfig, type AppConfig } from './config';

export type { AppConfig } from './config';

export const configStore = writable<AppConfig>(initialConfig);

let saveTimeout: number;
configStore.subscribe((value) => {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = window.setTimeout(async () => {
    try {
      await chrome.storage.local.set({ config: value });
    } catch (e) {
      console.error(e);
    }
  }, 300);
});

export const loadConfig = async () => {
  try {
    const data = await chrome.storage.local.get('config');
    if (data?.config) {
      const saved = data.config as Partial<AppConfig>;
      configStore.update((current) => ({ ...current, ...saved }));
    }
  } catch (e) {
    console.error(e);
  }
};

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes.config) {
    const nextConfig = changes.config.newValue as AppConfig;
    configStore.update((current) => {
      if (JSON.stringify(current) !== JSON.stringify(nextConfig)) {
        return nextConfig;
      }
      return current;
    });
  }
});

export const resetConfig = async () => {
  try {
    configStore.set({ ...initialConfig });
  } catch (e) {
    console.error(e);
  }
};
