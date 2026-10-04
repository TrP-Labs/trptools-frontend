<script lang="ts">
	import { setContext, type Snippet } from 'svelte';
	import { FIELD_CONTEXT, type FieldContext } from '$lib/utils/fieldContext';

	interface Props {
		label: string;
		hint?: string;
		error?: string;
		for?: string;
		class?: string;
		children: Snippet;
	}

	let { label, hint, error, for: forId, class: className = '', children }: Props = $props();
	const labelId = $props.id();
	const descriptionId = `${labelId}-description`;
	setContext<FieldContext>(FIELD_CONTEXT, {
		labelId,
		get descriptionId() { return error || hint ? descriptionId : undefined; },
		get invalid() { return Boolean(error); }
	});
</script>

<div class="flex flex-col gap-1.5 {className}">
	<label
		id={labelId}
		for={forId}
		class="text-xs font-semibold tracking-wide text-text-muted uppercase select-none"
	>
		{label}
	</label>

	{@render children()}

	{#if error}
		<p id={descriptionId} class="text-xs text-danger">{error}</p>
	{:else if hint}
		<p id={descriptionId} class="text-xs text-text-subtle">{hint}</p>
	{/if}
</div>
