<script lang="ts">
  interface Option {
    value: string;
    label: string;
  }

  interface SelectProps {
    options: Option[];
    value: string;
    placeholder?: string;
    disabled?: boolean;
  }

  let {
    options,
    value = $bindable<string>(),
    placeholder = '',
    disabled = false,
  }: SelectProps = $props();
</script>

<div
  class="relative flex flex-1 items-center overflow-hidden rounded-lg bg-slate-200 p-1 focus-within:ring-2 focus-within:ring-blue-400"
>
  <select
    bind:value
    {disabled}
    class="w-full cursor-pointer appearance-none border-none bg-transparent px-2 py-1.5 text-xs font-bold text-slate-700 focus:outline-none disabled:cursor-not-allowed disabled:text-slate-400"
  >
    {#if placeholder}
      <option value="" disabled>{placeholder}</option>
    {/if}
    {#each options as option (option.value)}
      <option value={option.value}>{option.label}</option>
    {/each}
  </select>

  <svg
    class="pointer-events-none absolute right-3 h-3 w-3 text-slate-500"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="3"
    aria-hidden="true"
  >
    <path stroke-linecap="round" stroke-linejoin="round" d="M6 9l6 6 6-6" />
  </svg>
</div>
