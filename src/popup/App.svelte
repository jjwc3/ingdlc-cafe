<script lang="ts">
  import { onMount } from 'svelte';

  import Papa from 'papaparse';

  import BoardExcept from '@/components/BoardExcept.svelte';
  import Header from '@/components/Header.svelte';
  import Modal from '@/components/Modal.svelte';
  import MultiSwitch from '@/components/MultiSwitch.svelte';
  import { configStore, loadConfig, resetConfig } from '@/modules/configStore';
  import { clearReadArticles, countReadArticles } from '@/modules/readStore';

  let readCount = $state(0);
  let showResetModal = $state(false);
  let showClearReadModal = $state(false);

  function findAll<T>(arr: T[], value: T): number[] {
    const indices: number[] = [];
    arr.forEach((element, index) => {
      if (element === value) {
        indices.push(index);
      }
    });
    return indices;
  }

  let schedule = $state(['로딩중', '로딩중']);

  const fetchSchedule = async () => {
    schedule = ['로딩중', '로딩중'];
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = d.getMonth() + 1;
    const dd = d.getDate();
    const date = [yyyy, mm, dd];

    const nextDate = new Date(yyyy, mm - 1, dd + 1).getDate();

    const url =
      'https://docs.google.com/spreadsheets/d/1n-ERReiHweDiCJcXTMkWRBUellktnBYQDbFmouExnas/export?format=csv';

    let csv = [];

    const text = await (await fetch(url)).text();
    csv = Papa.parse(text, { skipEmptyLines: true }).data;

    if (date[0] !== Number(csv[0][3]) || date[1] !== Number(csv[0][13])) {
      schedule = ['오류', '오류']; // noMatch
      return;
    }

    const rowDateIndex = [2, 5, 8, 11, 14, 17];
    const columnDayIndex = [3, 8, 13, 18, 23, 28, 33];

    let dateArr = [];
    let textArr = [];

    rowDateIndex.forEach((dateIndex) => {
      columnDayIndex.forEach((dayIndex) => {
        dateArr.push(csv[dateIndex][dayIndex].trim());
        textArr.push(csv[dateIndex + 1][dayIndex].trim());
      });
    });

    const oneIndex = findAll(dateArr, '1');
    dateArr = dateArr.slice(oneIndex[0], oneIndex[1]);
    textArr = textArr.slice(oneIndex[0], oneIndex[1]);

    if (Number(dateArr[date[2] - 1]) !== date[2]) {
      schedule = ['오류', '오류']; // err
      return;
    } else {
      let temp = [textArr[date[2] - 1], textArr[date[2]]];
      temp.forEach((value, index) => {
        if (value === '') temp[index] = '정규방송';
      });
      if (date[2] + 1 === nextDate) {
        schedule = temp;
      } else {
        schedule = [temp[0], '직접 확인'];
      }
    }
  };

  async function performReset() {
    try {
      await resetConfig();
    } catch (e) {
      console.error(e);
    } finally {
      showResetModal = false;
    }
  }

  async function performClearRead() {
    try {
      await clearReadArticles();
      readCount = 0;
    } catch (e) {
      console.error(e);
    } finally {
      showClearReadModal = false;
    }
  }

  onMount(async () => {
    await loadConfig();
    readCount = await countReadArticles();
    await fetchSchedule();
  });
</script>

<div
  style="min-width:400px; max-width:400px"
  class="bg-slate-50 px-2 py-4 text-slate-900"
>
  <Header title="INGDLC for Naver Cafe" />

  <hr class="mx-7 my-3 border-slate-300" />
  <footer
    class="flex w-full items-center justify-between gap-4 px-7 text-sm font-bold"
  >
    <div class="flex min-w-0 flex-1" title={schedule[0]}>
      <p class="text-nowrap">오늘: &nbsp;</p>
      <p
        class="{schedule[0].includes('오류') || schedule[0].includes('휴방')
          ? 'text-red-500'
          : 'text-black'} truncate"
      >
        {schedule[0]}
      </p>
    </div>
    <div class="flex min-w-0 flex-1" title={schedule[1]}>
      <p class="text-nowrap">내일: &nbsp;</p>
      <p
        class="{schedule[1].includes('오류') ||
        schedule[1].includes('휴방') ||
        schedule[1].includes('직접 확인')
          ? 'text-red-500'
          : 'text-black'} truncate"
      >
        {schedule[1]}
      </p>
    </div>
    <button
      id="schedule-reload"
      class="shrink-0 text-sm font-medium text-nowrap hover:cursor-pointer hover:font-bold"
      onclick={fetchSchedule}
      >새로고침
    </button>
  </footer>
  <hr class="mx-7 my-3 border-slate-300" />

  <div class="flex flex-col">
    <div
      class="m-4 rounded-md border border-slate-100 bg-white px-3 py-4 shadow-xl transition-all duration-500 ease-in-out hover:shadow-2xl"
    >
      <MultiSwitch
        title="이미지 가리기"
        subtitle="몰컴모드"
        options={[
          { label: 'OFF', value: 0 },
          { label: '이미지', value: 1 },
          { label: '이미지 + 배경', value: 2 },
        ]}
        bind:value={$configStore.blur.enabled}
      />

      {#if $configStore.blur.enabled > 0}
        <MultiSwitch
          title="마우스 올리면 원본 보기"
          options={[
            { label: 'OFF', value: 0 },
            { label: 'ON', value: 1 },
          ]}
          bind:value={$configStore.blur.hoverReveal}
        />
      {/if}

      <MultiSwitch
        title="읽은 글 표시"
        subtitle={readCount > 0 ? `${readCount.toLocaleString()}개 기록됨` : ''}
        options={[
          { label: 'OFF', value: 0 },
          { label: 'ON', value: 1 },
        ]}
        bind:value={$configStore.read.enabled}
      />

      <BoardExcept />

      <MultiSwitch
        title="방송 중 ON AIR 버튼"
        options={[
          { label: 'OFF', value: 0 },
          { label: 'ON', value: 1 },
        ]}
        bind:value={$configStore.liveAlert.enabled}
      />

      <MultiSwitch
        title="새 탭에서 게시글만 로딩"
        subtitle="카페 전체 대신 본문만"
        options={[
          { label: 'OFF', value: 0 },
          { label: 'ON', value: 1 },
        ]}
        bind:value={$configStore.redirect.article}
      />

      <MultiSwitch
        title="모바일 → PC"
        options={[
          { label: 'OFF', value: 0 },
          { label: 'ON', value: 1 },
        ]}
        bind:value={$configStore.redirect.mobile}
      />
    </div>
  </div>

  <footer class="flex justify-center gap-4">
    <button
      class="text-xs text-slate-400 transition-all duration-300 ease-in-out hover:cursor-pointer hover:font-bold hover:text-slate-600"
      onclick={() => (showClearReadModal = true)}
      >읽은 글 기록 삭제
    </button>
    <button
      class="text-xs text-slate-400 transition-all duration-300 ease-in-out hover:cursor-pointer hover:font-bold hover:text-slate-600"
      onclick={() => (showResetModal = true)}
      >설정 초기화
    </button>
  </footer>
</div>

<Modal
  bind:show={showResetModal}
  title="설정 초기화"
  message="모든 설정을 초기화하시겠습니까? 읽은 글 기록과 게시판 제외 설정은 유지됩니다."
  buttonMessage="확인"
  onConfirm={performReset}
/>

<Modal
  bind:show={showClearReadModal}
  title="읽은 글 기록 삭제"
  message="저장된 읽은 글 기록을 모두 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다."
  buttonMessage="삭제"
  onConfirm={performClearRead}
/>
