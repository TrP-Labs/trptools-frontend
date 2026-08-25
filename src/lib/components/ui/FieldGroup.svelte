<script lang="ts">
	import type { Snippet } from 'svelte';

	/**
	 * A titled band of related fields.
	 *
	 * The editors grew field by field until name, colour, dispatch shares and
	 * publishing all sat in one undifferentiated grid. Grouping them gives each
	 * setting somewhere it obviously belongs, and gives the reader a way to skip
	 * the parts they did not come for.
	 */
	interface Props {
		title: string;
		description?: string;
		/** Two columns by default; one stacks the fields full width. */
		columns?: 1 | 2;
		class?: string;
		children: Snippet;
	}

	let { title, description, columns = 2, class: className = '', children }: Props = $props();
</script>

<section class="space-y-3 {className}">
	<div class="flex flex-wrap items-baseline gap-x-2.5 border-b border-border-base pb-1.5">
		<h3 class="text-xs font-semibold tracking-wide text-text-muted uppercase">{title}</h3>
		{#if description}
			<p class="text-xs text-text-subtle">{description}</p>
		{/if}
	</div>

	<div class={columns === 1 ? 'space-y-4' : 'grid gap-4 sm:grid-cols-2'}>
		{@render children()}
	</div>
</section>
