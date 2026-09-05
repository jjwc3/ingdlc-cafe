<script lang="ts">
  let { title }: { title: string } = $props();
</script>

<header>
  <h1 class="mt-3 mb-1 text-center text-2xl font-bold">{title}</h1>

  <div class="text-center text-xs text-slate-500">
    Ver.<span>{chrome.runtime.getManifest().version}</span>
  </div>

  <div class="absolute top-2 right-2">
    <a
      href="index.html"
      target="_blank"
      class="text-xs text-slate-400 transition-all duration-300 ease-in-out hover:cursor-pointer hover:font-bold hover:text-slate-600"
      >새 창에서 열기</a
    >
  </div>
</header>
