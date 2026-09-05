## POPUP

- 이미지 가리기 (몰컴모드)
- 읽은 글 표시
- 전체글 제외 게시판
- ON AIR 버튼
- 모바일 → PC

## CONTENT SCRIPTS

| 진입점            | 대상             | all_frames | run_at         |
| ----------------- | ---------------- | ---------- | -------------- |
| `redirect-mobile` | m.cafe.naver.com |            | document_start |
| `blur`            | cafe.naver.com   | ✓          | document_start |
| `cafe`            | cafe.naver.com   | ✓          |                |
| `liveAlert`       | cafe.naver.com   |            |                |
| `content.css`     | cafe.naver.com   | ✓          |                |
