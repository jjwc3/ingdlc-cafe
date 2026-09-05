<script lang="ts">
  let {
    show = $bindable(),
    title = '',
    message,
    buttonMessage = '',
    onConfirm,
  } = $props();

  function close() {
    show = false;
  }

  async function handleConfirm() {
    if (onConfirm) {
      await onConfirm();
    }
    close();
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      close();
    }
  }
</script>

{#if show}
  <div
    class="fixed inset-0 z-100 flex cursor-default items-center justify-center bg-slate-900/60 p-4 backdrop-blur-[1px]"
    role="button"
    tabindex="0"
    onclick={close}
    onkeydown={handleKeyDown}
    aria-label="닫기 배경"
  >
    <div
      class="w-full max-w-60 cursor-auto rounded-xl border border-slate-200 bg-white p-4 text-left shadow-2xl outline-none"
      role="dialog"
      aria-modal="true"
      tabindex="-1"
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => e.stopPropagation()}
    >
      <div class="mb-3">
        <h3 class="text-sm font-bold text-slate-800">{title}</h3>
        <p class="mt-1 text-[11px] leading-relaxed text-slate-500">
          {message}
        </p>
      </div>

      <div class="mt-4 flex flex-row gap-2">
        {#if buttonMessage}
          <button
            type="button"
            class="flex-1 rounded-lg bg-slate-100 py-2 text-[11px] font-bold text-slate-500 transition-colors outline-none hover:bg-slate-200 focus:ring-2 focus:ring-slate-300"
            onclick={close}
          >
            취소
          </button>
          <button
            type="button"
            class="flex-1 rounded-lg bg-red-500 py-2 text-[11px] font-bold text-white shadow-sm shadow-red-200 transition-colors outline-none hover:bg-red-600 focus:ring-2 focus:ring-red-300"
            onclick={handleConfirm}
          >
            {buttonMessage}
          </button>
        {:else}
          <button
            type="button"
            class="flex-1 rounded-lg bg-slate-100 py-2 text-[11px] font-bold text-slate-500 transition-colors outline-none hover:bg-slate-200 focus:ring-2 focus:ring-slate-300"
            onclick={close}
          >
            확인
          </button>
        {/if}
      </div>
    </div>
  </div>
{/if}
