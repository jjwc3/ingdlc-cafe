# INGDLC for Naver Cafe

네이버 카페용 크롬 확장.

## 기능

- **이미지 가리기 (몰컴모드)** — 페이지의 모든 이미지를 거의 투명하게(`opacity: 0.05`). 마우스를 올리면 원본 표시
- **읽은 글 표시** — 읽은 게시글을 목록에서 회색으로. 카페별로 기록
- **전체글 제외 게시판** — 전체글보기에서 특정 게시판의 글을 숨김
- **ON AIR 버튼** — 방송 중이면 우상단에 표시
- **모바일 → PC** — `m.cafe.naver.com` 주소를 PC 버전으로 전환

## 개발

```bash
bun install
bun run dev          # 개발 서버 (HMR)
bun run build        # dist/ 생성 + release/ 에 zip 패킹
bun run lint         # ESLint
bun run format       # Prettier
```

`chrome://extensions` → 개발자 모드 → 압축해제된 확장 프로그램을 로드 → `dist` 선택.

## 구조

[structure.md](./structure.md) 참조.

```
src/
├── background.ts       서비스 워커 (session 접근 허용, 탭 닫기, 방송 여부 조회)
├── components/         팝업용 Svelte 컴포넌트
├── modules/            설정·읽은 글 저장소·주소 판별
├── lib/                URL 파서, DOM 관찰, 안내 배너
├── content/            콘텐츠 스크립트 (진입점별 디렉터리)
└── popup/              설정 UI
```

## 라이선스 고지

모바일 → PC 기능은 MIT 라이선스의 naver-cafe-only-pc에서 파생했다.
[THIRD-PARTY-NOTICES.md](./THIRD-PARTY-NOTICES.md) 참조.
