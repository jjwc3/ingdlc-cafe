/**
 * 이미지 블러 토글. all_frames로 모든 문서에서 실행된다.
 *
 * 실제 블러는 public/blur.css가 정적으로 담당한다. 이 스크립트는 <html>에 마커 클래스를
 * 붙였다 떼는 일만 한다. 덕분에 SPA가 이미지를 새로 삽입해도 감지할 필요가 없다.
 */
import { readConfig, type AppConfig } from '@/modules/config';

function apply( blur: AppConfig['blur'] ): void {
  const root = document.documentElement;
  root.classList.toggle( 'IDC_blur', blur.enabled > 0 );
  root.classList.toggle( 'IDC_blur_bg', blur.enabled === 2 );
  root.classList.toggle(
      'IDC_blur_hover',
      blur.enabled > 0 && blur.hoverReveal === 1,
  );
}

try {
  await readConfig().then( ( config ) => apply( config.blur ) );
} catch ( e ) {
  console.error( e );
}

// 팝업에서 설정을 바꾸면 열려 있는 탭에 즉시 반영한다.
chrome.storage.onChanged.addListener( ( changes, areaName ) => {
  if ( areaName !== 'local' || !changes.config ) return;
  const next = changes.config.newValue as AppConfig | undefined;
  if ( next?.blur ) apply( next.blur );
} );
