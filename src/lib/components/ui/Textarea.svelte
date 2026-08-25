<script lang="ts">
	import type { HTMLTextareaAttributes } from 'svelte/elements';

	interface Props {
		value?: string;
		class?: string;
		/** The element itself, so a dialog can put the cursor in it. */
		element?: HTMLTextAreaElement | null;
	}

	let {
		value = $bindable(''),
		class: className = '',
		element = $bindable(null),
		...rest
	}: Props & HTMLTextareaAttributes = $props();
</script>

<textarea
	bind:this={element}
	bind:value
	class="w-full resize-y rounded-lg border border-border-base bg-background-secondary px-3 py-2 text-sm text-text
		placeholder:text-text-subtle focus:border-accent focus:outline-none
		disabled:cursor-not-allowed disabled:opacity-60 {className}"
	{...rest}
></textarea>
