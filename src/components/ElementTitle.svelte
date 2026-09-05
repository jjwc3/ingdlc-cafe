<script lang="ts">
  interface ElementTitleProps {
    title: string;
    subtitle?: string;
  }
  let { title, subtitle }: ElementTitleProps = $props();
</script>

<div class="mb-1.5 flex flex-row items-center">
  <span class="flex items-center text-sm font-semibold"># {title}</span>
  {#if subtitle}
    <span class="ml-2 text-xs font-bold text-slate-500">{subtitle}</span>
  {/if}
</div>
