<script lang="ts">
  import ElementTitle from '@/components/ElementTitle.svelte';
  import Select from '@/components/Select.svelte';
  import { listCafes, setExcluded, type CafeEntry } from '@/modules/boardStore';

  let cafes = $state<CafeEntry[]>([]);
  let loaded = $state(false);
  let selectedCafeId = $state('');
  let selectedMenuId = $state('');

  const cafe = $derived(cafes.find((c) => c.cafeId === selectedCafeId));

  /** Only boards not yet excluded appear in the dropdown. */
  const addable = $derived(
    cafe
      ? Object.entries(cafe.boards)
          .filter(([menuId]) => !cafe.excluded.includes(Number(menuId)))
          .map(([menuId, name]) => ({ value: menuId, label: name }))
          .sort((a, b) => a.label.localeCompare(b.label))
      : [],
  );

  /** Currently excluded boards; falls back to the ID when the name is unknown. */
  const excludedList = $derived(
    cafe
      ? cafe.excluded
          .map((menuId) => ({
            menuId,
            name: cafe.boards[String(menuId)] ?? `게시판 ${menuId}`,
          }))
          .sort((a, b) => a.name.localeCompare(b.name))
      : [],
  );

  async function apply(cafeId: string, next: number[]) {
    await setExcluded(cafeId, next);
    cafes = cafes.map((c) =>
      c.cafeId === cafeId ? { ...c, excluded: next } : c,
    );
  }

  async function add() {
    if (!cafe || !selectedMenuId) return;
    const menuId = Number(selectedMenuId);
    if (cafe.excluded.includes(menuId)) return;

    await apply(cafe.cafeId, [...cafe.excluded, menuId]);
    selectedMenuId = '';
  }

  async function remove(menuId: number) {
    if (!cafe) return;
    await apply(
      cafe.cafeId,
      cafe.excluded.filter((m) => m !== menuId),
    );
  }

  $effect(() => {
    void (async () => {
      cafes = await listCafes();
      loaded = true;
      if (!cafes.some((c) => c.cafeId === selectedCafeId)) {
        selectedCafeId = cafes[0]?.cafeId ?? '';
      }
    })();
  });
</script>

<div class="mb-4 last:mb-0">
  <ElementTitle title="전체글 제외 게시판" subtitle="선택한 게시판을 숨김" />

  {#if !loaded}
    <p class="text-2xs text-slate-400">불러오는 중…</p>
  {:else if cafes.length === 0}
    <p class="text-2xs leading-relaxed text-slate-500">
      카페를 한 번 방문하면 게시판 목록이 여기에 나타납니다.
    </p>
  {:else}
    {#if cafes.length > 1}
      <div class="mb-2 flex">
        <Select
          options={cafes.map((c) => ({
            value: c.cafeId,
            label:
              (c.cafeName ?? c.cafeId) +
              (c.excluded.length > 0 ? ` (${c.excluded.length})` : ''),
          }))}
          bind:value={selectedCafeId}
        />
      </div>
    {/if}

    <div class="mb-2 flex flex-row gap-1">
      <Select
        options={addable}
        bind:value={selectedMenuId}
        placeholder={addable.length > 0
          ? '게시판 선택'
          : '추가할 게시판이 없습니다'}
        disabled={addable.length === 0}
      />
      <button
        type="button"
        class="rounded-lg bg-slate-200 px-3 text-xs font-bold text-slate-500 transition-colors hover:bg-blue-500 hover:text-white disabled:cursor-not-allowed disabled:text-slate-400 disabled:hover:bg-slate-200"
        disabled={!selectedMenuId}
        onclick={add}>추가</button
      >
    </div>

    {#if excludedList.length > 0}
      <ul class="flex flex-col gap-1">
        {#each excludedList as item (item.menuId)}
          <li
            class="flex items-center justify-between rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600"
          >
            <span class="truncate">{item.name}</span>
            <button
              type="button"
              class="ml-2 shrink-0 text-slate-400 transition-colors hover:text-red-500"
              aria-label="{item.name} 제외 해제"
              onclick={() => remove(item.menuId)}>✕</button
            >
          </li>
        {/each}
      </ul>
    {:else}
      <p class="text-2xs text-slate-400">제외한 게시판이 없습니다.</p>
    {/if}
  {/if}
</div>
