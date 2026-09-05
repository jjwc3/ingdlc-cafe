<script lang="ts">
  let {
    title = '',
    subtitle = '',
    options = [],
    value = $bindable(),
  } = $props();

  let currentIndex = $derived(options.findIndex((opt) => opt.value === value));

  let safeIndex = $derived(currentIndex === -1 ? 0 : currentIndex);

  let sliderWidth = $derived(options.length > 0 ? 100 / options.length : 0);
</script>

<div class="mb-4 last:mb-0">
  <div class="mb-1.5 flex flex-row items-center">
    <span class="flex items-center text-sm font-semibold"># {title}</span>
    {#if subtitle}
      <span class="ml-2 text-xs font-bold text-slate-500">{subtitle}</span>
    {/if}
  </div>

  <div
    class="relative flex w-full items-center overflow-hidden rounded-lg bg-slate-200 p-1"
  >
    <div
      class="absolute top-1 bottom-1 rounded-md bg-white shadow-sm transition-all duration-300 ease-in-out"
      style="width: calc({sliderWidth}% - 8px); left: calc({safeIndex *
        sliderWidth}% + 4px);"
    ></div>

    {#each options as opt (opt.value)}
      <button
        type="button"
        class="relative z-10 flex-1 py-1.5 text-[11px] font-bold transition-colors duration-200
               {value === opt.value
          ? 'text-blue-600'
          : 'text-slate-500 hover:text-slate-700'}"
        onclick={() => (value = opt.value)}
      >
        {opt.label}
      </button>
    {/each}
  </div>
</div>
