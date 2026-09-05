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
      // The service worker does the fetch: cross-origin, cached across tabs.
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

  // Blink briefly when the stream goes live, to draw the eye.
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
   * Sits on top of the cafe page, so no Tailwind (its preflight would reset
   * the host page). Only this Svelte-scoped block is used.
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
