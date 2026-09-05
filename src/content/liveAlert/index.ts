/**
 * 카페 접속 중 방송이 켜져 있으면 우상단에 ON AIR 버튼을 띄운다.
 *
 * 최상위 문서에만 마운트한다(all_frames 아님).
 */
import { mount } from 'svelte';

import { readConfig } from '@/modules/config';

import App from './App.svelte';

async function init() {
  const config = await readConfig();
  if (config.liveAlert.enabled !== 1) return;

  if (document.querySelector('[data-ingdlc-root="live-alert"]')) return;

  const container = document.createElement('div');
  container.dataset.ingdlcRoot = 'live-alert';
  container.style.display = 'contents';
  document.body.appendChild(container);

  mount(App, { target: container });
}

await init();
