<script lang="ts">
  import { onDestroy, onMount } from 'svelte';

  const STATION_URL = 'https://play.sooplive.co.kr/nanajam';

  const OFFAIR_INTERVAL = 10_000;
  const ONAIR_INTERVAL = 60_000;

  let onAir = $state(false);
  let blinking = $state(false);
  let timer: number | undefined;
  let destroyed = false;

  async function check() {
    try {
      // 실제 조회는 서비스 워커가 한다(교차 출처 + 탭 간 캐시 공유).
      const res = await chrome.runtime.sendMessage({
        action: 'INGDLC_LIVE_CHECK',
      });
      onAir = res?.onAir === true;
    } catch (e) {
      console.error(e);
      onAir = false;
    }

    if (destroyed) return;

    if (onAir) {
      blink();
      timer = window.setTimeout(check, ONAIR_INTERVAL);
    } else {
      timer = window.setTimeout(check, OFFAIR_INTERVAL);
    }
  }

  // 방송이 켜진 직후 잠깐 깜박여 눈에 띄게 한다.
  function blink() {
    blinking = true;
    window.setTimeout(() => (blinking = false), 3000);
  }

  onMount(() => {
    void check();
  });

  onDestroy(() => {
    destroyed = true;
    if (timer !== undefined) clearTimeout(timer);
  });
</script>

{#if onAir}
  <button
    type="button"
    data-ingdlc="live-alert"
    class="onair"
    class:blinking
    onclick={() => window.open(STATION_URL)}
  >
    ● ON AIR
  </button>
{/if}

<style>
  /*
   * 카페 페이지 위에 얹히므로 Tailwind(preflight)를 쓰지 않는다.
   * Svelte가 스코프를 잡아주는 이 블록만 사용한다.
   */
  .onair {
    position: fixed;
    top: 5px;
    right: 20px;
    z-index: 10000;
    padding: 5px;
    border: none;
    border-radius: 5px;
    background-color: #fee2e2;
    color: #7f1d1d;
    font-size: 13px;
    font-weight: 700;
    line-height: 1;
    opacity: 0.6;
    cursor: pointer;
    transition: opacity 0.3s ease-in-out;
  }

  .onair:hover {
    opacity: 1;
  }

  .onair.blinking {
    animation: idc-onair-blink 0.6s ease-in-out 5;
  }

  @keyframes idc-onair-blink {
    0%,
    100% {
      opacity: 0.6;
    }
    50% {
      opacity: 0.1;
    }
  }
</style>
