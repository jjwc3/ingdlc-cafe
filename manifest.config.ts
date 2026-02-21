import {defineManifest} from '@crxjs/vite-plugin'
import pkg from './package.json'

export default defineManifest({
  manifest_version: 3,
  name: "INGDLC for Naver Cafe",
  version: pkg.version,
  icons: {
    48: 'public/logo.png',
    // 16: 'public/ingdlc-cafe-icon-16.png',
    // 48: 'public/ingdlc-cafe-icon-48.png',
    // 128: 'public/ingdlc-cafe-icon-128.png',
  },
  action: {
    default_icon: {
      48: 'public/logo.png',
      // 16: 'public/ingdlc-soop-icon-16.png',
      // 32: 'public/ingdlc-soop-icon-32.png',
    },
    default_popup: 'src/popup/index.html',
  },
  "background": {
    "service_worker": "src/background.ts",
    "type": "module"
  },
  content_scripts: [
    {
      js: ['src/content/main.ts'],
      matches: ['https://*/*'],
    }
  ],
  permissions: [
    'storage',
    'webRequest'
  ],
  "web_accessible_resources": [
    {
      "resources": ["src/assets/*.png", "src/assets/*.svg"],
      "matches": ["<all_urls>"]
    }
  ],
  host_permissions: [
      "https://cafe.naver.com/*"
  ]
})
