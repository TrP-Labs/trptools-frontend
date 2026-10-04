<script lang="ts">
	import { getContext } from 'svelte';
	import { FIELD_CONTEXT, type FieldContext } from '$lib/utils/fieldContext';
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
	const field = getContext<FieldContext | undefined>(FIELD_CONTEXT);
</script>

<textarea
	bind:this={element}
	bind:value
	aria-labelledby={field?.labelId}
	aria-describedby={field?.descriptionId}
	aria-invalid={field?.invalid || undefined}
	class="w-full resize-y rounded-lg border border-border-base bg-background-secondary px-3 py-2 text-sm text-text
		placeholder:text-text-subtle focus:border-accent focus:outline-none
		disabled:cursor-not-allowed disabled:opacity-60 {className}"
	{...rest}
></textarea>
