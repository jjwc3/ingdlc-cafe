<script lang="ts">
  interface TextInputProps {
    placeHolder?: string;
    value: string;
    onFocus: () => void;
    onBlur: () => void;
    onEnter: () => void;
  }
  let {
    placeHolder,
    value = $bindable<string>(),
    onFocus,
    onBlur,
    onEnter,
  }: TextInputProps = $props();

  let inputRef = $state<HTMLInputElement | undefined>();
</script>

<input
  type="text"
  placeholder={placeHolder}
  class="w-full border-none bg-transparent px-2 py-1.5 text-xs font-bold text-slate-700 focus:ring-0 focus:outline-none"
  bind:this={inputRef}
  bind:value
  onfocus={onFocus}
  onblur={onBlur}
  onkeydown={(e) => {
    if (e.key === 'Escape') {
      inputRef?.blur();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      inputRef?.blur();
      onEnter();
    }
  }}
/>
