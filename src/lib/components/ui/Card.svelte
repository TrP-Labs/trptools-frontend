<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		title?: string;
		description?: string;
		class?: string;
		padded?: boolean;
		actions?: Snippet;
		children: Snippet;
	}

	let {
		title,
		description,
		class: className = '',
		padded = true,
		actions,
		children
	}: Props = $props();
</script>

<section class="card {className}">
	{#if title || actions}
		<header
			class="flex flex-wrap items-start justify-between gap-3 border-b border-border-base px-5 py-4"
		>
			<div class="min-w-0">
				{#if title}
					<h2 class="text-base font-semibold text-text">{title}</h2>
				{/if}
				{#if description}
					<p class="mt-1 text-sm text-text-muted">{description}</p>
				{/if}
			</div>
			{#if actions}
				<div class="flex shrink-0 flex-wrap items-center gap-2">{@render actions()}</div>
			{/if}
		</header>
	{/if}

	<div class={padded ? 'p-5' : ''}>
		{@render children()}
	</div>
</section>
