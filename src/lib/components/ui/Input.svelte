<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';

	interface Props {
		value?: string | number;
		class?: string;
	}

	let { value = $bindable(''), class: className = '', ...rest }: Props & HTMLInputAttributes =
		$props();
</script>

<input
	bind:value
	class="w-full rounded-lg border border-border-base bg-background-secondary px-3 py-2 text-sm text-text
		placeholder:text-text-subtle focus:border-accent focus:outline-none
		disabled:cursor-not-allowed disabled:opacity-60 {className}"
	{...rest}
/>
