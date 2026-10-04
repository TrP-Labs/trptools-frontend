<script lang="ts">
	import { getContext } from 'svelte';
	import { FIELD_CONTEXT, type FieldContext } from '$lib/utils/fieldContext';
	import type { HTMLInputAttributes } from 'svelte/elements';

	interface Props {
		value?: string | number;
		class?: string;
	}

	let { value = $bindable(''), class: className = '', ...rest }: Props & HTMLInputAttributes =
		$props();
	const field = getContext<FieldContext | undefined>(FIELD_CONTEXT);
</script>

<input
	bind:value
	aria-labelledby={field?.labelId}
	aria-describedby={field?.descriptionId}
	aria-invalid={field?.invalid || undefined}
	class="w-full rounded-lg border border-border-base bg-background-secondary px-3 py-2 text-sm text-text
		placeholder:text-text-subtle focus:border-accent focus:outline-none
		disabled:cursor-not-allowed disabled:opacity-60 {className}"
	{...rest}
/>
