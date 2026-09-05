/**
 * Shows an ON AIR button while the stream is live.
 * Top frame only.
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

void init();
