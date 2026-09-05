import { defineManifest } from '@crxjs/vite-plugin';

import pkg from './package.json';

export default defineManifest({
  manifest_version: 3,
  name: 'INGDLC for Naver Cafe',
  version: pkg.version,
  description:
    '네이버 카페: 이미지 가리기, 읽은 글 표시, 게시판 제외, 모바일 → PC',
  icons: {
    16: 'ingdlc-cafe-icon-16.png',
    48: 'ingdlc-cafe-icon-48.png',
    128: 'ingdlc-cafe-icon-128.png',
  },
  action: {
    default_icon: {
      16: 'ingdlc-cafe-icon-16.png',
      32: 'ingdlc-cafe-icon-32.png',
      48: 'ingdlc-cafe-icon-48.png',
      128: 'ingdlc-cafe-icon-128.png',
    },
    default_popup: 'src/popup/index.html',
  },
  background: {
    service_worker: 'src/background.ts',
    type: 'module',
  },
  content_scripts: [
    // 리다이렉트는 페이지가 그려지기 전에 실행돼야 한다.
    {
      matches: ['https://m.cafe.naver.com/*'],
      js: ['src/content/redirect-mobile/index.ts'],
      run_at: 'document_start',
    },
    // 블러는 마커 클래스만 토글한다. 실제 스타일은 아래 CSS가 담당한다.
    {
      matches: ['https://cafe.naver.com/*'],
      js: ['src/content/blur/index.ts'],
      all_frames: true,
      run_at: 'document_start',
    },
    // 읽은 글 표시 · 게시판 제외. 레거시 홈 iframe의 목록도 처리해야 해 all_frames.
    {
      matches: ['https://cafe.naver.com/*'],
      js: ['src/content/cafe/index.ts'],
      all_frames: true,
    },
    // ON AIR 버튼은 최상위 문서에만.
    {
      matches: ['https://cafe.naver.com/*'],
      js: ['src/content/liveAlert/index.ts'],
    },
    // CRXJS가 css 전용 엔트리를 번들하지 못해 public/에 두고 정적 경로로 참조한다.
    {
      matches: ['https://cafe.naver.com/*'],
      css: ['content.css'],
      all_frames: true,
    },
  ],
  permissions: ['storage'],
  // 서비스 워커에서 방송 여부를 조회하기 위함. 콘텐츠 스크립트는 matches로 충분하다.
  host_permissions: ['https://chapi.sooplive.co.kr/*'],
});
