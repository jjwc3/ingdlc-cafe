/**
 * Image blur toggle. Runs in every frame (all_frames).
 *
 * The imported stylesheet does the actual work; this script only flips marker
 * classes on <html>, so SPA-inserted images need no detection.
 *
 * The CSS must be imported here rather than declared as a `css` entry pointing
 * into public/ — CRXJS tries to import such files in dev mode and Vite rejects
 * it ("Cannot import non-asset file"). Importing from a JS entry makes CRXJS
 * add it to the manifest's `css` array, which works in both dev and build.
 */
import { readConfig, type AppConfig } from '@/modules/config';

import '../content.css';

function apply(blur: AppConfig['blur']): void {
  const root = document.documentElement;
  root.classList.toggle('IDC_blur', blur.enabled > 0);
  root.classList.toggle('IDC_blur_bg', blur.enabled === 2);
  root.classList.toggle(
    'IDC_blur_hover',
    blur.enabled > 0 && blur.hoverReveal === 1,
  );
}

void readConfig().then((config) => apply(config.blur));

// Reflect popup changes in already-open tabs.
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'local' || !changes.config) return;
  const next = changes.config.newValue as AppConfig | undefined;
  if (next?.blur) apply(next.blur);
});
